import chrome from 'chrome-aws-lambda';
import { launch } from 'puppeteer-core';
import lighthouse from 'lighthouse';
import { URL } from 'url';

async function getOptions() {
  const options = {
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  };
  return options;
}

async function getResult(url) {
  const options = await getOptions();
  const browser = await launch(options);
  const { port } = new URL(browser.wsEndpoint());
  const result = await lighthouse(url, {
    port,
    output: 'html',
    logLevel: 'error',
  });
  await browser.close();
  return result;
}

module.exports = async (req, res) => {
  const result = await getResult('https://zeit.co/about');
  if (req && result && result.lhr && result.lhr.categories) {
    res.end('lighthouse:RANDOMNESS_PLACEHOLDER');
  } else {
    res.end('result is empty');
  }
};
