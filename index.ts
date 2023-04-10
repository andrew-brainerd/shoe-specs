import chalk from 'chalk';
import fs from 'fs';
import puppeteer, { ElementHandle, Page, PuppeteerLaunchOptions } from 'puppeteer';
import { BASE_URL, MENS_SHOES_URL } from 'constants/brooks';
import { Browser } from 'puppeteer';
import { Definition, Product, ProductData, Widget, WidgetValue } from 'types';
import existingProductData from 'data.json';

const pupOptions: PuppeteerLaunchOptions = {
  headless: true,
  defaultViewport: { width: 800, height: 1000 }
};

// if (process.platform === 'win32') {
//   pupOptions.executablePath = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
// }

(async () => {
  const marketplace = process.argv[2];

  if (!marketplace) {
    console.log('Please provide a marketplace');
    return -1;
  }

  const browser = await puppeteer.launch(pupOptions);

  if (marketplace === 'on-running') {
    await doOnRunningShit(browser);
  } else {
    await doBrooksShit(browser);
  }

  await browser.close();
})();

async function doOnRunningShit(browser: Browser) {
  const url = 'https://www.on-running.com/en-us/products/cloudboom-echo-57/womens/white-mint-shoes-57.98256';
  const womensCloudboomEchoPage = await openNewTab(browser, url);

  const quickFacts = await getQuickFacts(browser, womensCloudboomEchoPage);

  console.log('Quick Facts:', quickFacts);
}

async function getQuickFacts(browser: Browser, page: Page) {
  try {
    const quickFacts = await page.$$('#mainContent #quick-facts article [class^="quickFactCard"]'); //  #quick-facts article > div [class^="content"]

    return await Promise.all(
      quickFacts.map(async quckFact => {
        const factHeader = await quckFact.$eval('h3', h3 => h3.textContent);
        const factValue = await quckFact.$eval('p', p => p.textContent);
        const factIcon = await quckFact.$eval('svg', svg => svg.parentElement?.innerHTML);

        return {
          title: factHeader,
          value: factValue,
          icon: factIcon
        };
      })
    );
  } catch (e) {
    console.error('Error happened here', e);
    await browser.close();
  }
}

async function doBrooksShit(browser: Browser) {
  const mensShoePage = await openNewTab(browser, MENS_SHOES_URL);

  let productData = { products: [...existingProductData.products] } as ProductData;

  try {
    const productList = await mensShoePage.$$('#maincontent .o-products-grid ul > li .m-product-tile__body');

    await Promise.all(
      productList.map(async (el, index) => {
        const href = await el.$eval('a', link => link.getAttribute('href'));
        const productUrl = `${BASE_URL}${href}`;

        if (href) {
          //  && index === 0
          const data = await getProductData(browser, productUrl);

          if (data) {
            productData.products.push(data);
          }
        }
      })
    );
  } catch (e) {
    console.error('Error happened here', e);
    await browser.close();
  }

  productData.products.sort((prodA, prodB) => (prodA.name < prodB.name ? -1 : 1));

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
}

async function getProductData(browser: Browser, productUrl: string) {
  try {
    const productPage = await openNewTab(browser, productUrl);
    const productName = await productPage.$eval('.m-buy-box-header__name', n => n.textContent);
    const widgets = await productPage.$$('.m-features-widget');
    const definitions = await productPage.$$('.m-definition-widget');

    const name = productName ? productName.trim() : 'Product Name';

    const widgetsData = await getWidgetsData(widgets);
    const definitionsData = await getDefinitionsData(definitions);

    const product: Product = {
      name,
      widgetsData,
      definitionsData
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

async function getDefinitionsData(definitions: ElementHandle<Element>[]) {
  return await Promise.all(
    definitions.map(async definitionRow => {
      try {
        const definitionName = await definitionRow.$eval('.m-info-label p', p => p.textContent);
        const definitionValue = await definitionRow.$eval('.a-type-p--caption', p => p.textContent);

        const definitionData: Definition = {
          name: definitionName || '',
          value: definitionValue || ''
        };

        return definitionData;
      } catch (e) {
        return {
          name: '',
          value: ''
        };
      }
    })
  ).then(defs => defs.filter(def => def.name !== ''));
}

async function openNewTab(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url).catch(e => console.error('Navigation Error', e));
  await page.waitForNetworkIdle(); // { timeout: 5000 }
  // await page.waitForNavigation({ waitUntil: 'networkidle0' });

  return page;
}

async function getClass(elementHandle: ElementHandle) {
  return await (await elementHandle.getProperty('className')).jsonValue();
}

async function wait(time: number) {
  await new Promise(res => setTimeout(res, time));
}
