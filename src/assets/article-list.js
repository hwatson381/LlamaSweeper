/*
  metadata for articles

  articleId: a unique identifier for the article, used to match it up with the file
  component: a lazy import of the Vue component that contains the article content
  title: the title of the article
  slug: a URL-friendly version of the title
  excerptHtml: a short summary of the article in HTML format
  date: the publication date of the article
  author: the author of the article
  readLength: an indicator of how long the article is to read. 1 is very short, 2 is short, 3 is medium, 4 is long, and 5 is very long.

*/

let articleList = [
  {
    articleId: 'nfEffGuide',
    component: () => import('pages/articles/NfEffGuideArticle.vue'),
    title: 'No Flag expert 100% efficiency game review/semi-guide',
    slug: 'nf-eff-guide',
    excerptHtml: `An advanced and in-depth guide on the skill of no flag efficiency. That is, how to win an expert board without using flags and in the minimum number of clicks required. I also review one of my games where I did this.`,
    date: '2026-05-07',
    author: 'Llama',
    readLength: 5
  }
];

export default articleList;