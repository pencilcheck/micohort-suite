// api/run.js
import edgeChromium from 'chrome-aws-lambda'

// Importing Puppeteer core as default otherwise
// it won't function correctly with "launch()"
import puppeteer from 'puppeteer-core'

// You may want to change this if you're developing
// on a platform different from macOS.
// See https://github.com/vercel/og-image for a more resilient
// system-agnostic options for Puppeteeer.
const LOCAL_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export default async function (req, res) {
  // Edge executable will return an empty string locally.
  const executablePath = await edgeChromium.executablePath || LOCAL_CHROME_EXECUTABLE
  
  try {
    const browser = await puppeteer.launch({
      executablePath,
      args: edgeChromium.args,
      headless: true,
    })
    
    const page = await browser.newPage()
    await page.goto('https://github.com')
  } catch (e) {
    console.log(e)
  }
  
  res.send('hello')
}