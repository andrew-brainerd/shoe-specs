import chalk from 'chalk';
import fs from 'fs';
import puppeteer, { ElementHandle, PuppeteerLaunchOptions } from 'puppeteer';
import { BASE_URL, MENS_SHOES_URL } from 'constants/brooks';
import { Browser } from 'puppeteer';
import { Product, ProductData, Widget, WidgetValue } from 'types';

const pupOptions: PuppeteerLaunchOptions = {
  headless: true,
  defaultViewport: { width: 800, height: 1000 },
  timeout: 10000
};

if (process.platform === 'win32') {
  pupOptions.executablePath = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
}

(async () => {
  const browser = await puppeteer.launch(pupOptions);
  const mensShoePage = await openNewTab(browser, MENS_SHOES_URL);

  let productData = { products: [] } as ProductData;

  try {
    const productList = await mensShoePage.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');

    await Promise.all(
      productList.map(async (el, index) => {
        const href = await el.$eval('a', link => link.getAttribute('href'));
        const productUrl = `${BASE_URL}${href}`;

        if (href) {
          const productWidgets = await getProductData(browser, productUrl);

          if (productWidgets) {
            productData.products.push(productWidgets);
          }
        }
      })
    );
  } catch (e) {
    console.error('Error happened here', e);
    await browser.close();
  }

  productData.products.sort((prodA, prodB) => prodA.name < prodB.name ? -1 : 1);

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

async function getProductData(browser: Browser, productUrl: string) {
  try {
    const productPage = await openNewTab(browser, productUrl);
    const productName = await productPage.$eval('.m-buy-box-header__name', n => n.textContent);
    const widgets = await productPage.$$('.m-features-widget');

    const widgetsData = await getWidgetsData(widgets)

    const name = productName ? productName.trim() : 'Product Name';

    const product: Product = {
      name,
      widgetsData
    };

    console.log(`Got specs for ${chalk.blue(product.name)}`);

    return product;
  } catch (e) {
    console.log(chalk.yellow(`Error getting product specs from ${productUrl}`));
  }
}

async function getWidgetsData(widgets: ElementHandle<Element>[]) {
  return await Promise.all(
    widgets.map(async widget => {
      const widgetClass = await getClass(widget);
      const widgetType = widgetClass.split('--')[1] ?? 'Unknown widget Type';
      const widgetTitle = await widget.$eval('.m-info-label p', p => p.textContent);

      let widgetValues: WidgetValue[] = [];

      if (widgetClass.includes('accent-circle') || widgetClass.includes('accent-line')) {
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
      } else {
        console.warn('Unknown widget found', widgetClass);
      }

      const widgetData: Widget = {
        title: widgetTitle || '',
        type: widgetType,
        values: widgetValues
      };

      return widgetData;
    })
  );
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
