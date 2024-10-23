import { Fragment, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import type { ActionFunction, RouteObject, LoaderFunction } from 'react-router-dom'

import { generateModalRoutes, generatePreservedRoutes, generateRegularRoutes } from './core'

type Element = () => JSX.Element
type Module = { default: Element; Loader?: LoaderFunction; Action?: ActionFunction; Catch?: Element; Pending?: Element }

const PRESERVED = import.meta.glob<Module>('/src/pages/(_app|404).{jsx,tsx}', { eager: true })
const MODALS = import.meta.glob<Pick<Module, 'default'>>('/src/pages/**/[+]*.{jsx,tsx}', { eager: true })
const ROUTES = import.meta.glob<Module>(
  ['/src/pages/**/[\\w[-]*.{jsx,tsx,mdx}', '!/src/pages/**/(_!(layout)*(/*)?|_app|404)*'],
  { eager: true },
)

const preservedRoutes = generatePreservedRoutes<Omit<Module, 'Action'>>(PRESERVED)
const modalRoutes = generateModalRoutes<Element>(MODALS)

const regularRoutes = generateRegularRoutes<RouteObject, Partial<Module>>(ROUTES, (module, key) => {
  const index = /index\.(jsx|tsx|mdx)$/.test(key) && !key.includes('pages/index') ? { index: true } : {}
  const Default = module?.default || Fragment
  const Page = () => (module?.Pending ? <Suspense fallback={<module.Pending />} children={<Default />} /> : <Default />)
  return { ...index, Component: Page, ErrorBoundary: module?.Catch, loader: module?.Loader, action: module?.Action }
})

const _app = preservedRoutes?.['_app']
const _404 = preservedRoutes?.['404']

const Default = _app?.default || Outlet

const Modals_ = () => {
  const Modal = modalRoutes[useLocation().state?.modal] || Fragment
  return <Modal />
}

const Layout = () => (
  <>
    <Default /> <Modals_ />
  </>
)

const App = () => (_app?.Pending ? <Suspense fallback={<_app.Pending />} children={<Layout />} /> : <Layout />)

const app = { Component: _app?.default ? App : Layout, ErrorBoundary: _app?.Catch, loader: _app?.Loader }
const fallback = { path: '*', Component: _404?.default || Fragment }

export const routes: RouteObject[] = [{ ...app, children: [...regularRoutes, fallback] }]

let router: ReturnType<typeof createBrowserRouter> | undefined
const getRouter = () => {
  if (!router) {
    router = createBrowserRouter(routes)
  }
  return router
}
export const Routes = () => <RouterProvider router={getRouter()} />

/** @deprecated `<Modals />` is no longer needed, it will be removed in future releases */
export const Modals = () => (console.warn('[generouted] `<Modals />` will be removed in future releases'), null)
