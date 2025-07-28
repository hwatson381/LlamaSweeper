const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/HomePage.vue') },
      { name: 'play', path: 'game/:variant?', component: () => import('pages/PlayPage.vue') },
      { path: 'others', component: () => import('pages/OthersPage.vue') },
      { path: 'about', component: () => import('pages/AboutPage.vue') },
      { path: 'data-entry', component: () => import('pages/DataEntryPage.vue') },
      { path: 'bookmark', component: () => import('pages/BookmarkletPage.vue') },
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
