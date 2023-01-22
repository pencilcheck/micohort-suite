// api/test.js
import type { NextApiRequest, NextApiResponse } from 'next'

import { testPuppeteer } from '../../utils/puppeteer';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.send(await testPuppeteer());
}

export default handler;