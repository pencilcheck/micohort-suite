// api/test.js
import type { NextApiRequest, NextApiResponse } from 'next'

import { testLinkedinPuppeteer } from '../../utils/puppeteer';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.send(await testLinkedinPuppeteer());
}

export default handler;