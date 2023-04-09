import chalk from 'chalk';
import fs from 'fs';
import puppeteer, { ElementHandle, PuppeteerLaunchOptions } from 'puppeteer';
import { MENS_SHOES_URL } from 'constants/brooks';
import { Browser } from 'puppeteer';
import { Product, ProductData, Widget, WidgetValue } from 'types';

const pupOptions: PuppeteerLaunchOptions = {
  headless: true,
  // slowMo: 500,
  defaultViewport: { width: 800, height: 1000 }
};

// if (process.platform === 'win32') {
//   pupOptions.executablePath = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
// }

(async () => {
  const browser = await puppeteer.launch(pupOptions);
  const page = await browser.newPage();
  await page.waitForNetworkIdle();
  await page.goto(MENS_SHOES_URL);

  let productData = { products: [] } as ProductData;

  try {
    const productList = await page.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');

    await Promise.all(
      productList.map(async (el, index) => {
        const href = await el.$eval('a', link => link.getAttribute('href'));
        const productUrl = `https://www.brooksrunning.com${href}`;

        if (href && index < 10) {
          const productsData = await getProductWidgets(browser, productUrl);

          if (productsData) {
            productData.products.push(productsData);
          }
        }
      })
    );
  } catch (e) {
    console.error('Error happened here', e);
    await browser.close();
  }

  fs.writeFile('preview.json', JSON.stringify(productData, null, 2), err => {
    if (err) {
      console.error(err);
    }
  });

  fs.writeFile('data.json', JSON.stringify(productData), err => {
    if (err) {
      console.error(err);
    }
  });

  await browser.close();
})();

async function getProductWidgets(browser: Browser, productUrl: string) {
  try {
    console.log(`Navigating to ${productUrl}`);
    const productPage = await openNewTab(browser, productUrl);
    const productName = await productPage.$eval('.m-buy-box-header__name', n => n.textContent);
    const specWidgets = await productPage.$$('.m-features-widget');

    const widgetsData = await Promise.all(
      specWidgets.map(async widget => {
        const widgetClass = await getClass(widget);
        const widgetTitle = await widget.$eval('.m-info-label p', p => p.textContent);

        let widgetValues: WidgetValue[] = [];

        if (widgetClass.includes('accent-circle')) {
          const featureItems = await widget.$$('.a-feature-item');

          await Promise.all(
            featureItems.map(async featureItem => {
              const featureName = await featureItem.evaluate(fi => fi.textContent);
              const isMarked = (await getClass(featureItem)).includes('marked');

              if (featureName) {
                widgetValues.push({ name: featureName, isMarked });
              }
            })
          );
        } else if (widgetClass.includes('accent-line')) {
          // console.log('Accent Line');
        } else {
          console.warn('Unknown widget found', widgetClass);
        }

        return {
          title: widgetTitle || '',
          values: widgetValues
        } as Widget;
      })
    );

    console.log('Product Name', productName);

    const name =  productName ? productName.trim() : 'Product Name'

    const product: Product = {
      name,
      widgetsData
    };

    return product;
  } catch (e) {
    console.error('Error getting product specs', e);
  }
}

async function getProductBestFor(browser: Browser, productUrl: string) {
  try {
    const productPage = await openNewTab(browser, productUrl);

    await wait(3000);
    const bestForContainer = await productPage.$$('.m-long-description__best-for');
    return bestForContainer[0].$eval('img', image => image.getAttribute('src'));
  } catch (e) {
    console.error('Error getting product specs', e);
  }
}

async function openNewTab(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url).catch(e => console.error('Navigation Error', e));
  await page.waitForNetworkIdle({ timeout: 5000 });

  return page;
}

async function getClass(elementHandle: ElementHandle) {
  return await (await elementHandle.getProperty('className')).jsonValue();
}

async function wait(time: number) {
  await new Promise(res => setTimeout(res, time));
}
