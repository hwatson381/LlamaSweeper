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
    articleId: 'example',
    component: () => import('pages/articles/ExampleArticle.vue'),
    title: 'The life and times of spongebob squarepants',
    slug: 'example-article',
    excerptHtml: `In this article, I will talk about examples. Examples are very important.
    Some people say that examples are the best way to learn, and I would have to agree 
    with them. If you want to learn something new, it's often very helpful to see an 
    example of it. Not only are examples good, they can also be a way to learn.`,
    date: '2024-06-01',
    author: 'Llama',
    readLength: 3
  },
  {
    articleId: 'nfEffGuide',
    component: () => import('pages/articles/NfEffGuideArticle.vue'),
    title: 'No Flag expert 100% efficiency game review/semi-guide',
    slug: 'nf-eff-guide',
    excerptHtml: `A really long guide about the advanced concept of no flag efficiency.`,
    date: '2026-05-07',
    author: 'Llama',
    readLength: 5
  }
];

export default articleList;