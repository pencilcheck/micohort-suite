import { MicpaPerson } from '@prisma/client';
import puppeteer from 'puppeteer-core';
import { mapLimit } from 'async';
import select from '@gizt/selector';

import { env } from "../env/server.mjs";

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
  
  const hrefs = await page.$$eval(SELECTOR.PROFILE_SEARCH_LINKS, links => links.map((a: any) => a.href));
  return hrefs as string[];
}

export const ScrapePages = async (page: puppeteer.Page, urls: string[]) => {
  const data = await mapLimit(urls, 1, async (url: string) => {
    let result = []
    // we intercept browser requests instead scrape each profile
    page.on('response', async (response) => {
      let requestUrl = response.url()
      if (requestUrl.includes(API_ENDPOINT)) {
        const textBody = await response.text()
        try {
          let jsonRes = JSON.parse(textBody)
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
      let profile_image = await page.$eval(`.pv-top-card-profile-picture img`, e => e.getAttribute("src"))

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
        let email = await page.$eval(SELECTOR.EMAIL_VALUE, e => e.getAttribute("href"))
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

export const TokenizeDoc = (doc: any) => {
  const keys = Object.keys(doc)

  let newDoc: any = {}

  keys.forEach((k) => {
    newDoc[k] = doc[k].join(' ')
  })

  return newDoc
}

export const ParseComponent = (title: string, urn: string, data: any[]) => {
  const topComponents = data.find(r => r.topComponents && r.entityUrn === urn)?.topComponents

  const names = select(
    '[1:].components.fixedListComponent[].components[].components.entityComponent[].title[].text',
    topComponents
  )
  //console.log(title || urn, names)

  return {
    [title || urn]: names
  }
}

// Partial shape
interface DocType {
  email: string;
  connections: string;
  name: string;
  position: string;
  profile_image: string;
  profile_url: string;
}

export const ParseData = (data: any[]) => {
  const responses: any[] = select(SEARCH.CARDS.path, data).flat()
  const cards = responses.find(r => r?.entityUrn?.match(SEARCH.CARDS.entityUrn))?.['*cards']

  var doc: Partial<DocType> = {
    email: '',
    connections: '',
    name: '',
    position: '',
    profile_image: '',
    profile_url: '',
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
  doc['profile_url'] = select(SEARCH.PROFILE_URL, data)
  doc['email'] = select(SEARCH.EMAIL, data)
  doc['connections'] = select(SEARCH.CONNECTIONS, data)
  doc['name'] = select(SEARCH.NAME, data)
  doc['position'] = select(SEARCH.POSITION, data)
  doc['profile_image'] = select(SEARCH.PROFILE_IMAGE, data)

  console.log('-----------')

  return doc;
}

export const GetFields = (doc: any) => {
  return Object.keys(doc)
}

export const LunrIndex = async (docs: DocType[]) => {
  var fields = GetFields(docs[0]);

  //var idx = lunr(function () {
  //this.ref('name')
  //fields.forEach(f => {
  //this.field(f)
  //}, this)

  //docs.forEach(d => {
  //this.add(d)
  //}, this)
  //})

   //save index
  //let idxData = JSON.stringify(idx, null, 4);
  //console.log(idxData)
  //fs.writeFileSync('static/index.json', idxData);

   //save data
  //let data = JSON.stringify(docs, null, 4);
  //console.log(data)
  //fs.writeFileSync('static/data.json', data);
}
