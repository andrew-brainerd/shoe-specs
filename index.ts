import chalk from 'chalk';
import cliProgress from 'cli-progress';
import fs from 'fs';
import puppeteer, { JSHandle, PuppeteerLaunchOptions } from 'puppeteer';
import { MENS_SHOES_URL } from 'constants/brooks';

const pupOptions: PuppeteerLaunchOptions = { headless: true };

if (process.platform === 'win32') {
  pupOptions.executablePath = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
}

console.log(chalk.yellow(`Getting list of men's shoes...`));

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let progress = 0;

// progressBar.start(100, progress);

(async () => {
  updateProgress(10);
  const browser = await puppeteer.launch(pupOptions);
  updateProgress(20);
  const page = await browser.newPage();

  // await page.goto(MENS_SHOES_URL);
  await page.goto('https://www.brooksrunning.com/en_us/mens-road-running-shoes/');
  updateProgress(30);
  try {
    updateProgress(55);

    console.log('Page:', await page.title());

    // .m-product-tile__name
    // .o-products-grid__item

    try {
      const brooksPage = await page.waitForSelector('#maincontent .o-products-grid ul > li');
      updateProgress(90);

      const elHandleArray = await page.$$('#maincontent .o-products-grid ul > li .m-product-tile__body a');

      elHandleArray.map(async (el, index) => {
        // const element = await el.evaluate(e => e.innerHTML);
        // console.log('Element', element);

        const link = await el.getProperty('href');
        // const href = await link.evaluate(l => {
        //   console.log('Href', l);
        // });

        const href = await link.evaluate<string[]>((l: string) => l);

        console.log('HREF:', href);

        // await href.click();
      });

      // console.log('Page', brooksPage);

      const products = await page.evaluate(el => el?.innerHTML, brooksPage);
      updateProgress(100);

      progressBar.stop();

      console.log('Products', products);

      // for (let i = 0; i < products.length; i++) {
      //   console.log('Product', products[i]);
      // }
    } catch (e) {
      updateProgress(100);
      console.error(e);
      await browser.close();
    }
  } catch (e) {
    console.error('Something fucked up', e);
  }
  await browser.close();
})();

function updateProgress(value: number) {
  if (progress < value) {
    const diff = value - progress;

    for (let i = 0; i < diff; i++) {
      progress++;
      progressBar.update(progress);
    }
  }
}

async function wait(time: number) {
  await new Promise(res => setTimeout(res, time));
}
