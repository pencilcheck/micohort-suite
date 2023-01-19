import { MicpaPerson } from '@prisma/client';
import puppeteer from 'puppeteer-core';
import { mapLimit } from 'async';
import select from '@gizt/selector';

import { env } from "../env/server.mjs";

// Partial shape
interface DocType {
  email: string[] | string;
  connections: string[] | string;
  name: string[] | string;
  position: string[] | string;
  profile_image: string[] | string;
  profile_url: string[] | string;
  [key: string]: string[] | string;
}

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

const SEARCH = {
  CARDS: {
    path: '[].response',
    entityUrn: new RegExp('.*fsd_profileTab:(.*,ALL,.*)', 'i'),
  },
  PROFILE_URL: '[].profile_url',
  EMAIL: '[].email',
  NAME: '[].name',
  POSITION: '[].position',
  PROFILE_IMAGE: '[].profile_image',
  EXPERIENCE: new RegExp('EXPERIENCE', 'i'),
  EDUCATION: new RegExp('EDUCATION', 'i'),
  CONNECTIONS: `[].connections`
};

const API_ENDPOINT = "https://www.linkedin.com/voyager/api/graphql"

export const LoginLinkedin = async (page: puppeteer.Page) => {
  // assuming authwall is up
  await page.goto('https://www.linkedin.com/login')
  await page.waitForSelector(SELECTOR.USERNAME_SELECTOR, { visible: true, timeout: 0 });

  // input username
  await page.click(SELECTOR.USERNAME_SELECTOR);
  await page.keyboard.type(env.SCRAPER_USERNAME);

  // input password
  await page.click(SELECTOR.PASSWORD_SELECTOR);
  await page.keyboard.type(env.SCRAPER_PASSWORD);

  await page.click(SELECTOR.BUTTON_SELECTOR);
  await page.waitForSelector(SELECTOR.FEED_SELECTOR, { visible: true, timeout: 0 });
}

export const SearchPeople = async (page: puppeteer.Page, person: MicpaPerson): Promise<string[]> => {
  await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(person.name)}&origin=FACETED_SEARCH&sid=COi`)
  await page.waitForSelector(SELECTOR.PROFILE_SEARCH_LINKS, { visible: true, timeout: 0 });

  //await page.click(SELECTOR.LOCATION_FILTER);
  //await page.click(SELECTOR.LOCATION_SEARCH_INPUT);
  
  const hrefs = await page.$$eval<string[]>(SELECTOR.PROFILE_SEARCH_LINKS, (links: HTMLAnchorElement[]): string[] => links.map<string>((a: HTMLAnchorElement) => a.href || ''));
  return hrefs;
}

export const ScrapePages = async (page: puppeteer.Page, urls: string[]) => {
  const data = await mapLimit(urls, 1, async (url: string) => {
    const result = []
    // we intercept browser requests instead scrape each profile
    page.on('response', async (response) => {
      const requestUrl = response.url()
      if (requestUrl.includes(API_ENDPOINT)) {
        const textBody = await response.text()
        try {
          const jsonRes = JSON.parse(textBody) as {[key: string]: any}
          result.push({ url: requestUrl, response: jsonRes })
        } catch(e) {
          result.push({ url: requestUrl, response: textBody })
        }
      }
    })

    result.push({ profile_url: url })

    await page.goto(url);
    await page.waitForSelector(SELECTOR.PROFILE_BG_SELECTOR, { visible: true, timeout: 0 });
    //await page.screenshot({path: `verifytest.png`, fullPage: true});

    if (await page.$(SELECTOR.PICTURETOP)) {
      const profile_image = await page.$eval<string>(`.pv-top-card-profile-picture img`, (e: HTMLElement) => e.getAttribute("src") || '')

      result.push({ profile_image: profile_image })
    }

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
    if (await page.$(SELECTOR.CONTACTINFO)) {
      await page.click(SELECTOR.CONTACTINFO);
      await page.waitForSelector(SELECTOR.CONTACTINFO_LINK, { visible: true, timeout: 0 });

      if (await page.$(SELECTOR.EMAIL_VALUE)) {
        const email = await page.$eval(SELECTOR.EMAIL_VALUE, (e: HTMLElement) => e.getAttribute("href"))
        result.push({ email: email })
      }

      await page.click('button[data-test-modal-close-btn]');
    }

    if (await page.$(SELECTOR.MUTUAL_CONNECTION)) {
      await page.click(SELECTOR.MUTUAL_CONNECTION);
      await page.waitForSelector(SELECTOR.CONNECTION_LIST, { visible: true, timeout: 0 });
      const text = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('ul.reusable-search__entity-result-list');
        return el?.outerHTML;
      })
      result.push({ connections: text })
    }

    return result;
  })

  return data;
}

export const TokenizeDoc = (doc: DocType) => {
  const keys = Object.keys(doc)

  const newDoc: {[key: string]: string} = {}

  keys.forEach((k) => {
    newDoc[k] = (doc[k] as string[])?.join(' ')
  })

  return newDoc
}

export const ParseComponent = (title: string, urn: string, data: DocType[]) => {
  const topComponents = data.find(r => r.topComponents && r.entityUrn === urn)?.topComponents

  const names = select(
    '[1:].components.fixedListComponent[].components[].components.entityComponent[].title[].text',
    topComponents
  ) as string[]
  //console.log(title || urn, names)

  return {
    [title || urn]: names
  }
}

export const ParseData = (data: DocType[]): DocType => {
  const responses: DocType[] = (select(SEARCH.CARDS.path, data) as DocType[][]).flat()
  const cards = responses.find(r => (r?.entityUrn as string)?.match(SEARCH.CARDS.entityUrn))?.['*cards'] as string[]

  let doc: DocType = {
    email: select(SEARCH.EMAIL, data) as string[],
    connections: select(SEARCH.CONNECTIONS, data) as string[],
    name: select(SEARCH.NAME, data) as string[],
    position: select(SEARCH.POSITION, data) as string[],
    profile_image: select(SEARCH.PROFILE_IMAGE, data) as string[],
    profile_url: select(SEARCH.PROFILE_URL, data) as string[],
  }

  if (cards) {
    cards.forEach((c: string) => {
      try {
        doc = {
          ...ParseComponent(c, c, responses),
          ...doc,
        }
      } catch (e) {
      }
    })
  }

  console.log('-----------')

  return doc;
}

export const GetFields = (doc: DocType) => {
  return Object.keys(doc)
}