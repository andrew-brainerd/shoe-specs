import chalk from 'chalk';
import puppeteer, { ElementHandle, PuppeteerLaunchOptions } from 'puppeteer';
import { MENS_SHOES_URL } from 'constants/brooks';
import { Browser } from 'puppeteer';
import { Page } from 'puppeteer';

const pupOptions: PuppeteerLaunchOptions = {
  headless: true,
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

  try {
    const pageTitle = await page.title();

    try {
      const productList = await page.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');

      await Promise.all(
        productList.map(async (el, index) => {
          const href = await el.$eval('a', link => link.getAttribute('href'));
          const productUrl = `https://www.brooksrunning.com${href}`;

          if (href && index === 0) {
            await getProductWidgets(browser, productUrl);
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

async function getProductWidgets(browser: Browser, productUrl: string) {
  try {
    console.log(`Navigating to ${productUrl}\n`);
    const productPage = await openNewTab(browser, productUrl);

    const specWidgets = await productPage.$$('.m-features-widget');

    const widgetData = await Promise.all(
      specWidgets.map(async widget => {
        const widgetClass = await getClass(widget);
        const widgetTitle = await widget.$eval('.m-info-label p', p => p.textContent);

        let widgetValues: string[] = [];

        if (widgetClass.includes('accent-circle')) {
          const featureItems = await widget.$$('.a-feature-item');

          await Promise.all(
            featureItems.map(async featureItem => {
              const featureName = await featureItem.evaluate(fi => fi.textContent);

              if (featureName) {
                widgetValues.push(featureName);
              }
            })
          );
        } else if (widgetClass.includes('accent-line')) {
          // console.log('Accent Line');
        } else {
          console.warn('Unknown widget found', widgetClass);
        }
        return {
          title: widgetTitle,
          values: widgetValues
        };
      })
    );

    console.log(widgetData);
  } catch (e) {
    console.error('Error getting product specs', e);
  }
}

async function getProductBestFor(browser: Browser, productUrl: string) {
  try {
    console.log(`Navigating to ${productUrl}`);
    const productPage = await openNewTab(browser, productUrl);

    await wait(3000);
    const bestForContainer = await productPage.$$('.m-long-description__best-for');
    const imgSrc = await bestForContainer[0].$eval('img', image => image.getAttribute('src'));
    console.log('Icon', imgSrc);
  } catch (e) {
    console.error('Error getting product specs', e);
  }
}

async function openNewTab(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url).catch(e => console.log('Navigation Error', e));
  await page.waitForNetworkIdle({ timeout: 5000 });

  return page;
}

async function getClass(elementHandle: ElementHandle) {
  return await (await elementHandle.getProperty('className')).jsonValue();
}

async function wait(time: number) {
  await new Promise(res => setTimeout(res, time));
}
