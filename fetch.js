const http = require('got');
const cheerio = require('cheerio');
const { join, basename } = require('path');
const { outputFile } = require('fs-extra');
const { createHash } = require('crypto');

const BASE = 'https://docs.github.com';
const URL = `${BASE}/en/actions/learn-github-actions/workflow-syntax-for-github-actions`;

const OUT_DIR = join(__dirname, 'workflow-syntax');

(async () => {
  console.log('Loading document...');
  const $ = cheerio.load(await http.get(URL).text());

  console.log('Fetching stylesheets...');
  const links = $('link');
  for (const link of links) {
    if (link.attribs.rel == 'stylesheet') {
      const css = await http.get(`${BASE}${link.attribs.href}`).text();
      const name = basename(link.attribs.href);
      await outputFile(join(OUT_DIR, 'css', name), css);
      link.attribs.href = `css/${name}`;
    } else {
      $(link).remove();
    }
  }

  console.log('Removing scripts...');
  const scripts = $('script');
  for (const script of scripts) {
    $(script).remove();
  }

  console.log('Rebuilding links...');
  const as = $('a[href]');
  for (const a of as) {
    if (a.attribs.href.startsWith('/')) {
      a.attribs.href = `${BASE}${a.attribs.href}`;
    }
  }

  console.log('Rebuilding body...');
  const body = $('[data-search="article-body"]').html();
  $('body').html(body);
  $('body').css('padding', '16px');

  console.log('Output HTML...');
  const html = $.html();
  await outputFile(join(OUT_DIR, 'index.html'), html);
  const hash = createHash('sha1').update(html).digest('hex').substring(0, 8);
  await outputFile(join(__dirname, 'VERSION'), hash);
})();
