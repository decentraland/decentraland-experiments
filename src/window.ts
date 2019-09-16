export type Root = EventTarget &
  WindowSessionStorage &
  WindowLocalStorage & {
    analytics?: SegmentAnalytics.AnalyticsJS
  }

const handler: (...args: any[]) => any = () => null
const storage = (): Storage => ({
  clear: handler,
  getItem: handler,
  key: handler,
  removeItem: handler,
  setItem: handler,
  length: 0
})

const root: Root = (typeof window !== 'undefined' && window) || {
  addEventListener: handler,
  dispatchEvent: handler,
  removeEventListener: handler,
  localStorage: storage(),
  sessionStorage: storage()
}

export default root
