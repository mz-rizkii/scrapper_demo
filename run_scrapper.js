const puppeteer = require('puppeteer');
const path = require('path');
const { writeToPath } = require('@fast-csv/format');

const file_result = path.resolve(__dirname, 'result.csv');

const class_name = 'css-1bjwylw';

const class_price = 'css-o5uqvq';

const class_seller = 'css-1kr22w3';

const class_url = 'css-89jnbj';

const class_image = 'success fade';

const class_rating = 'css-177n1u3';

const makeDataLabel = (label, selector, class_label) => ({ label, selector, class_label });

const data_labels = [
  makeDataLabel('name', '.css-1bjwylw', class_name),
  makeDataLabel('detail', 'a.css-89jnbj[href]', class_url),
  makeDataLabel('price', '.css-o5uqvq', class_price),
  makeDataLabel('seller', '.css-1kr22w3', class_seller),
  makeDataLabel('rating', '.css-177n1u3', class_rating),
  makeDataLabel('image', '.css-jo3xxj img[src]', class_image)
];

const getLabelFromClass = (item_class) => {
  const [{ label }] = data_labels.filter(({ class_label }) => class_label === item_class);
  
  return label;
}

const makeProductData = (list_source) => {
  const rating_data = list_source.filter(({ item_class }) => item_class === class_rating);

  const rating = rating_data.length;

  const product_data = list_source.reduce((output, { item_text, item_src, item_url, item_class }) => {
    let value = item_text;

    const label = getLabelFromClass(item_class);

    switch (item_class) {
      case class_url:
        value = item_url;
        break;
      case class_image:
        value = item_src;
        break;
      case class_rating:
        value = '';
        break;
    }

    output[label] = value;

    return output;
  }, {});

  return { ...product_data, rating };
};

const exportPageContent = async () => {
  const timeout = 60000;
  const browser = await puppeteer.launch({
    args: [
      '--disable-web-security'
    ], devtools: true
  });
  const page = await browser.newPage();
  await page.goto('https://www.tokopedia.com/p/handphone-tablet/handphone');

  const resultsSelector = data_labels.reduce((output, { selector }, index) => {
    return `${output}${index > 0 ? ',' : ''}${selector}`;
  }, '');

  await page.waitForSelector(resultsSelector);

  // Extract the results from the page.
  const product_contents = await page.evaluate((resultsSelector) => {
    const anchors = Array.from(document.querySelectorAll(resultsSelector));

    return anchors.map((anchor) => {
      const item_class = anchor.className;
      const item_url = anchor.getAttribute('href');
      const item_text = anchor.innerText;
      const item_src = anchor.getAttribute('src');

      return { item_text, item_class, item_src, item_url };
    });
  }, resultsSelector);

  const product_indexes = product_contents.reduce((output, { item_class }, index) => {
    if (item_class === class_name) {
      output.push(index);
    }

    return output;
  }, []);

  console.log(product_indexes);

  let index = 0;

  const last_index = product_indexes.length - 1;

  let product_list = [];

  while (index < product_indexes.length) {
    let next_index = index + 1;

    if (next_index >= product_indexes.length) {
      next_index = last_index;
    }

    const product_data = product_contents.filter((data, item_index) => item_index >= index && item_index < product_indexes[next_index]);

    console.log(product_data);

    product_list.push(makeProductData(product_data));

    index++;
  }

  // console.log(product_list);

  writeToPath(file_result, product_list, { headers: true });

  await browser.close();
};

exportPageContent().then(() => {
  console.log('getting page completed');
  process.exit(0);
}).catch((error) => {
  console.log('failed to getting page data', error);
  process.exit(1);
});