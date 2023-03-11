import type { MicpaPerson } from '@prisma/client';
import puppeteer from 'puppeteer';
import type { Page, Browser } from 'puppeteer';
//import edgeChromium from 'chrome-aws-lambda';
//import puppeteer from 'puppeteer-core';
//import type { Page, Browser } from 'puppeteer-core';
import { mapLimit } from 'async';
import select from '@gizt/selector';
import fs from 'fs';
import _ from 'lodash';

// You may want to change this if you're developing
// on a platform different from macOS.
// See https://github.com/vercel/og-image for a more resilient
// system-agnostic options for Puppeteeer.
//const LOCAL_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const lambda = false;

import { env } from "../env/server.mjs";

// Endpoint types
export type PrepDocType = {
  profile_url: string; // required
  personId: string; // required: the micpaperson id
  screenshot?: string; // base64 string
}

export type DocType = Partial<{
  email?: string;
  connections?: string;
  name?: string;
  position?: string;
  profile_image?: string;
  compacted?: boolean;
} & UrlResponse & PrepDocType & UrnLiFsd>;

export type ComponentValue = {
  title: string;
  subComponents: string[];
}

type UrnLiFsd = {
  [key: string]: TopComponent[] | string | ComponentValue[];
}

type Information = DocType;

// LINKEDIN Voyager Internal ----- My best understanding of linkedin voyager response and they are constantly updating this format
type Components = {
  headerComponent?: {
    title: {
      text: string;
    }
  };
  insightComponent?: {
    text?: {
      text?: {
        text?: string;
      }
    }
  };
  entityComponent?: {
    title: {
      text: string;
    };
    caption: {
      text?: string;
    };
    subtitle: {
      text?: string;
    };
    subComponents?: SubComponents;
  };
  fixedListComponent?: {
    components: {
      components: Components;
    }[];
  };
  tabComponent?: {
    sections: {
      subComponent: {
        components: Components;
      }
    }[]
  };
}

type SubComponents = {
  components: {
    components: Components;
  }[];
}

export type TopComponent = {
  components: Components;
}

type Included = {
  topComponents?: TopComponent[];
  '*cards'?: string[];
  '$recipeTypes': string[];
  '$type': string;
  entityUrn: string;
}

type UrlResponse = {
  url?: string;
  response?: {
    included: Included
  };
}

// Internal selectors for puppeteer
const SELECTOR = {
  USERNAME_SELECTOR: 'input[name=session_key]',
  PASSWORD_SELECTOR: 'input[name=session_password]',
  BUTTON_SELECTOR: 'form > div.login__form_action_container > button',
  FEED_SELECTOR: 'div.feed-identity-module__actor-meta > div',
  PROFILE_BG_SELECTOR: 'div.live-video-hero-image__bg-image > div',
  PICTURETOP: '.pv-top-card-profile-picture',
  PROFILETOP: '.pv-text-details__left-panel',
  MUTUAL_CONNECTION: '.ph5.pb5 > a[href*="linkedin.com/search/results/people"]',
  CONNECTION_LIST: 'ul.reusable-search__entity-result-list',
  CONTACTINFO: '#top-card-text-details-contact-info',
  CONTACTINFO_LINK: `a.pv-contact-info__contact-link`,
  EMAIL_VALUE: "section.ci-email a.pv-contact-info__contact-link",
  LOCATION_FILTER: ".search-reusables__filter-trigger-and-dropdown button[aria-label*=\"Locations\"]",
  LOCATION_SEARCH_INPUT: ".search-basic-typeahead.search-vertical-typeahead input[aria-label*=\"location\"]",
  PROFILE_SEARCH_LINKS: "ul.reusable-search__entity-result-list li.reusable-search__result-container span.entity-result__title-text a",
};

const SELECTORV2 = {
  PROFILE_SEARCH_LINKS: '#main-content > section > ul > li > a',
};

const SEARCH = {
  CARDS: {
    path: '[].response.included',
    entityUrn: new RegExp('.*fsd_profileTab:(.*,ALL,.*)', 'i'),
  },
  PROFILE_URL: '[].profile_url',
  PERSON_ID: '[].personId',
  EMAIL: '[].email',
  NAME: '[].name',
  POSITION: '[].position',
  PROFILE_IMAGE: '[].profile_image',
  EXPERIENCE: new RegExp('EXPERIENCE', 'i'),
  EDUCATION: new RegExp('EDUCATION', 'i'),
  CONNECTIONS: `[].connections`
};

const API_ENDPOINT = "https://www.linkedin.com/voyager/api/graphql"

export async function initPage(): Promise<[Page, Browser]> {
  if (lambda) {
    // TODO REMOVE THIS AFTER TESTING ON RAILWAY WITHOUT LAMBDA
    // Edge executable will return an empty string locally.
    //const executablePath = await edgeChromium.executablePath || LOCAL_CHROME_EXECUTABLE

    //const browser = await puppeteer.launch({
      //executablePath,
      //args: edgeChromium.args,
      //headless: edgeChromium.headless,
      //ignoreHTTPSErrors: true,
      //timeout: 60000,
    //})
  }

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    timeout: 60000,
  })

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(600000);  // 60s timeout
  page.setDefaultTimeout(600000);  // 60s timeout
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"
  )

  return [page, browser];
}

// if this function throw an exception, very likely linkedin blocked us, just need to retry another time
// Deprecated
export const LoginLinkedin = async (page: Page) => {
  // assuming authwall is up
  await page.goto('https://www.linkedin.com/login')
  await page.waitForSelector(SELECTOR.USERNAME_SELECTOR);

  // input username
  await page.click(SELECTOR.USERNAME_SELECTOR);
  await page.keyboard.type(env.SCRAPER_USERNAME);

  // input password
  await page.click(SELECTOR.PASSWORD_SELECTOR);
  await page.keyboard.type(env.SCRAPER_PASSWORD);

  await page.click(SELECTOR.BUTTON_SELECTOR);
  await page.waitForSelector(SELECTOR.FEED_SELECTOR);
}

export async function testPuppeteer(): Promise<{ statusCode: number, body: string, headers: any }> {
  const [page, browser] = await initPage();
  await page.goto('https://www.google.com')
  const screenshot = await page.screenshot({ encoding: "base64" });
  await browser.close();
  return {
    statusCode: 200,
    body: `<img src="data:image/png;base64,${String(screenshot)}">`,
    headers: { "Content-Type": "text/html" }
  };
}

export async function testLinkedinPuppeteer(): Promise<{ screenshot: string }> {
  const [page, browser] = await initPage();
  await page.goto('https://www.linkedin.com/pub/dir?firstName=Mark&lastName=John&trk=people-guest_people-search-bar_search-submit', {
    referer: 'https://www.google.com/'
  })
  await page.goto('https://www.linkedin.com/in/mark-john-1aa87310?trk=people-guest_people_search-card', {
    referer: 'https://www.google.com/'
  })
  const screenshot = await page.screenshot({ encoding: "base64" });
  await browser.close();
  return {
    screenshot: `data:image/png;base64,${String(screenshot)}`,
  };
}

export async function findProfilesV2(person: MicpaPerson): Promise<PrepDocType[]> {
  const [page, browser] = await initPage();

  const firstName = person.name.split(' ')[0];
  const lastName = person.name.split(' ')[person.name.split(' ').length-1];
  if (firstName && lastName) {
    await page.goto(`https://www.linkedin.com/pub/dir?firstName=${firstName}&lastName=${lastName}&trk=people-guest_people-search-bar_search-submit`, {
      referer: 'https://www.google.com/'
    })
    // looks like linkedin sometimes will link to a profile directly instead of the search results
    if (page.url().match(/\/in\//i)) {
      const screenshot = await page.screenshot({ encoding: "base64" });
      await browser.close();
      return [{
        personId: person.id,
        profile_url: page.url(),
        screenshot: `data:image/png;base64,${String(screenshot)}`,
      }];
    }
    await page.waitForSelector(SELECTORV2.PROFILE_SEARCH_LINKS, { timeout: 0 });
    const hrefs: string[] = await page.$$eval<string[]>(SELECTORV2.PROFILE_SEARCH_LINKS, (links: Element[]): string[] => (links as HTMLAnchorElement[]).map<string>((a: HTMLAnchorElement) => a.href || ''));

    const docs = [];
    for (const href of hrefs) {
      await page.goto(href, {
        referer: 'https://www.google.com/'
      });
      const screenshot = await page.screenshot({ encoding: "base64" });
      docs.push({
        personId: person.id,
        profile_url: page.url(),
        screenshot: `data:image/png;base64,${String(screenshot)}`,
      });
    }

    await browser.close();
    return docs;
  }

  return [];
}

// Deprecated
export async function findProfiles(person: MicpaPerson): Promise<PrepDocType[] | undefined> {
  const [page, browser] = await initPage();
  let response;

  try {
    await LoginLinkedin(page);
  } catch (e) {
    // timeout could be due to security
    return undefined;
  }

  try {
    const hrefs = await SearchPeople(page, person.name);
    response = hrefs.map<PrepDocType>(url => ({ profile_url: url, personId: person.id }))
  } catch (e) {
    console.log(e)
  } finally {
    await browser.close();
  }
  
  return response;
}

// TODO modify this library for use if it works
// https://github.com/jvandenaardweg/linkedin-profile-scraper
export async function scrapeProfiles(preps: PrepDocType[]): Promise<DocType[] | undefined> {
  const [page, browser] = await initPage();
  let tokenizedDocs;

  try {
    await LoginLinkedin(page);
  } catch (e) {
    // timeout could be due to security
    return undefined;
  }

  try {
    tokenizedDocs = _(await ScrapePages(page, preps)).map(information => toDoc(information)).value();

  } catch (e) {
    console.log(e)
  } finally {
    await browser.close();
  }
  
  return tokenizedDocs;
}

/* utility functions */

// Deprecated
export const SearchPeople = async (page: Page, name: string): Promise<string[]> => {
  try {
    await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}&origin=FACETED_SEARCH&sid=COi`)
    await page.waitForSelector(SELECTOR.PROFILE_SEARCH_LINKS, { timeout: 30000 }); // wait 30s
    //await page.click(SELECTOR.LOCATION_FILTER);
    //await page.click(SELECTOR.LOCATION_SEARCH_INPUT);
    const hrefs: string[] = await page.$$eval<string[]>(SELECTOR.PROFILE_SEARCH_LINKS, (links: Element[]): string[] => (links as HTMLAnchorElement[]).map<string>((a: HTMLAnchorElement) => a.href || ''));
    return hrefs;
  } catch (e) {
    // timeout or other errors
    return [];
  }
}

export const ScrapePages = async (page: Page, partialDocs: PrepDocType[], parallel = 10): Promise<Information[][]> => {
  const hasProfileUrls = partialDocs.filter(d => d.profile_url);
  const data = await mapLimit<DocType, DocType[]>(hasProfileUrls, parallel, async (doc: DocType) => {
    try {
      const personIdInformation = { personId: doc.personId };
      return [...(doc.profile_url ? await ScrapePage(page, doc.profile_url) : []), personIdInformation];
    } catch (e) {
      // timeout or other errors
      return [];
    }
  });
  return data;
}

export const ScrapePage = async (page: Page, url: string): Promise<Information[]> => {
  const result = [];
  // we intercept browser requests instead scrape each profile
  page.on('response', (response) => {
    const requestUrl = response.url()
    if (requestUrl.includes(API_ENDPOINT)) {
      response.text().then(textBody => {
        const jsonRes = JSON.parse(textBody) as {[key: string]: unknown}
        result.push({ url: requestUrl, response: jsonRes })
      }, (e: unknown) => {
        result.push({ url: requestUrl, error: e instanceof Error ? e.message : String(e) })
      })
    }
  })

  result.push({ profile_url: url })

  console.log(`scrape page goto ${url}`)
  await page.goto(url, {
    referer: 'https://www.google.com/'
  })
  console.log("scrape page waitFor")
  await page.waitForSelector(SELECTOR.PROFILE_BG_SELECTOR, { timeout: 0 });
  //await page.screenshot({path: `verifytest.png`, fullPage: true});

  console.log("scrape page find picturetop")
  if (await page.$(SELECTOR.PICTURETOP)) {
    const profile_image = await page.$eval<string>(`.pv-top-card-profile-picture img`, (e: Element) => (e as HTMLElement).getAttribute("src") || '')

    result.push({ profile_image: profile_image })
  }

  console.log("scrape page find profiletop")
  if (await page.$(SELECTOR.PROFILETOP)) {
    const name = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(`.pv-text-details__left-panel > div:first-child > h1`);
      return el?.innerText;
    })

    result.push({ name: name })

    const position = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(`.pv-text-details__left-panel > div:nth-child(2)`);
      return el?.innerText;
    })

    result.push({ position: position })
  }

  // Email if it exists
  console.log("scrape page find contactinfo")
  if (await page.$(SELECTOR.CONTACTINFO)) {
    await page.click(SELECTOR.CONTACTINFO);
    await page.waitForSelector(SELECTOR.CONTACTINFO_LINK, { timeout: 0 });

    if (await page.$(SELECTOR.EMAIL_VALUE)) {
      const email = await page.$eval(SELECTOR.EMAIL_VALUE, (e: Element) => (e as HTMLElement).getAttribute("href"))
      result.push({ email: email || undefined })
    }

    await page.click('button[data-test-modal-close-btn]');
  }

  console.log("scrape page find mutual")
  if (await page.$(SELECTOR.MUTUAL_CONNECTION)) {
    await page.click(SELECTOR.MUTUAL_CONNECTION);
    await page.waitForSelector(SELECTOR.CONNECTION_LIST, { timeout: 0 });
    const text = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('ul.reusable-search__entity-result-list');
      return el?.outerHTML;
    })
    result.push({ connections: text })
  }

  console.log("scrape page return")
  return result;
}

export const toDoc = (information: Information[]): DocType => {
  return TokenizeDoc(ParseData(information));
}

export const TokenizeDoc = (doc: { [key: string]: boolean | string[] | unknown[] | string }): DocType => {
  return Object.keys(doc).reduce((init, k) => {
    if (Array.isArray(doc[k]) && typeof (doc[k] as unknown[])?.[0] === 'string') {
      return {
        ...init,
        [k]: (doc[k] as string[])?.join(' ').trim(),
      }
    } else if (Array.isArray(doc[k]) && (doc[k] as unknown[])?.length === 0) {
      return {
        ...init,
        [k]: '',
      }
    } else {
      return {
        ...init,
        [k]: doc[k], // no change
      }
    }
  }, {})
}

export const ParseData = (data: DocType[]): { [key: string]: boolean | string[] | unknown[] | string } => {
  // let's leave the complexity of parsing the response to the renderer, not the scraper
  const responses = (select(SEARCH.CARDS.path, data) as Included[][]).flat()
  const cardObj = responses
  //.filter(res => res['$recipeTypes'].includes('com.linkedin.6ad5ee1af9f1aa2477071ea5a858f984'))
  .filter(res => res['$type'] === 'com.linkedin.voyager.dash.identity.profile.tetris.Card')
  .reduce((init, component) => {
    return {
      ...init,
      [component['entityUrn']]: component.topComponents,
    }
  }, {})

  console.log('-----------')

  return {
    email: select(SEARCH.EMAIL, data),
    connections: select(SEARCH.CONNECTIONS, data),
    name: select(SEARCH.NAME, data),
    position: select(SEARCH.POSITION, data),
    profile_image: select(SEARCH.PROFILE_IMAGE, data),
    profile_url: select(SEARCH.PROFILE_URL, data),
    personId: select(SEARCH.PERSON_ID, data),
    compacted: false,
    ...cardObj,
  };
}
