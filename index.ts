import chalk from 'chalk';
import puppeteer, { PuppeteerLaunchOptions } from 'puppeteer';
import { MENS_SHOES_URL } from 'constants/brooks';
import { Browser } from 'puppeteer';
import { Page } from 'puppeteer';

const pupOptions: PuppeteerLaunchOptions = { headless: false };

if (process.platform === 'win32') {
  pupOptions.executablePath = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
}

console.log(chalk.yellow(`Getting list of men's shoes...`));

(async () => {
  const browser = await puppeteer.launch(pupOptions);
  const page = await browser.newPage();

  await page.goto(MENS_SHOES_URL);
  // await page.goto('https://www.brooksrunning.com/en_us/mens-road-running-shoes/');
  try {
    const pageTitle = await page.title();
    console.log('Landing Page:', pageTitle);

    try {
      const productList = await page.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');

      const shit = await Promise.all(
        productList.map(async (el, index) => {
          const href = await el.$eval('a', link => link.getAttribute('href'));

          const nextPage = `https://www.brooksrunning.com${href}`;

          if (href && index === 0) {
            await getProductSpecs(page, nextPage);
          }
        })
      );
    } catch (e: any) {
      console.error('Error happened here', e);
      // await browser.close();
    }
  } catch (e) {
    console.error('Something fucked up', e);
  }

  await browser.close();
})();

async function getProductSpecs(page: Page, productUrl: string) {
  try {
    // console.log('Next Page', productUrl);
    await page.goto(productUrl);
    // const productList = await page.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');
    const pageTitle = await page.title();
    console.log('Product Page:', pageTitle);
  } catch (e) {
    console.error('Error getting product specs', e);
  }
}

async function wait(time: number) {
  await new Promise(res => setTimeout(res, time));
}
