import chalk from 'chalk';
import puppeteer, { PuppeteerLaunchOptions } from 'puppeteer';
import { MENS_SHOES_URL } from 'constants/brooks';
import { Browser } from 'puppeteer';
import { Page } from 'puppeteer';

const pupOptions: PuppeteerLaunchOptions = {
  headless: false,
  slowMo: 500,
  defaultViewport: { width: 800, height: 1000 }
};

if (process.platform === 'win32') {
  pupOptions.executablePath = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
}

console.log(chalk.yellow(`Getting list of men's shoes...`));

(async () => {
  const browser = await puppeteer.launch(pupOptions);
  const page = await browser.newPage();
  await page.waitForNetworkIdle();

  await page.goto(MENS_SHOES_URL);
  // await page.goto('https://www.brooksrunning.com/en_us/mens-road-running-shoes/');
  try {
    const pageTitle = await page.title();
    console.log('Landing Page:', pageTitle);

    try {
      const productList = await page.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');

      await Promise.all(
        productList.map(async (el, index) => {
          const href = await el.$eval('a', link => link.getAttribute('href'));

          const nextPage = `https://www.brooksrunning.com${href}`;

          if (href && index < 3) {
            await getProductSpecs(browser, page, nextPage);
          }
        })
      );
    } catch (e) {
      console.error('Error happened here', e);
      await browser.close();
    }
  } catch (e) {
    console.error('Something fucked up', e);
  }

  await browser.close();
})();

async function getProductSpecs(browser: Browser, page: Page, productUrl: string) {
  try {
    console.log(`Navigating to ${productUrl}`);
    const productPage = await browser.newPage();
    await productPage.goto(productUrl).catch(e => console.log('Navigation Error', e));
    await productPage.waitForNetworkIdle({ timeout: 5000 });
    // const pageTitle = await page.title();
    // console.log('Product Page:', pageTitle);

    await wait(3000);
    const bestForContainer = await productPage.$$('.m-long-description__best-for');
    const imgSrc = await bestForContainer[0].$eval('img', image => image.getAttribute('src'));
    console.log('Icon', imgSrc);
  } catch (e) {
    // console.error('Error getting product specs', e);
  }
}

async function wait(time: number) {
  await new Promise(res => setTimeout(res, time));
}
