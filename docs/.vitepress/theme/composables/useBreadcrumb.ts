import { computed } from 'vue'
import { useRoute, useData } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import { NAV_TABS } from '../../../.vitepress/tabs.config'
import { useI18n } from '../../i18n/useI18n'

export interface BreadcrumbItem {
  text: string
  link?: string
}

const LOCALE_PREFIX_RE = /^\/(zh-CN|zh-HK)(?=\/|$)/

function stripLocale(p: string): string {
  return p.replace(LOCALE_PREFIX_RE, '') || '/'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

// 在 sidebar 中找指定 link 对应的标题（精确匹配）
function findTitleByLink(
  items: DefaultTheme.SidebarItem[],
  link: string,
): string | null {
  for (const item of items) {
    if (item.link === link && item.text) return stripHtml(item.text)
    if (item.items?.length) {
      const r = findTitleByLink(item.items, link)
      if (r) return r
    }
  }
  return null
}

// 在 sidebar 中找精确匹配 `${prefix}overview` 的 link
function findOverviewLink(
  items: DefaultTheme.SidebarItem[],
  target: string,
): string | null {
  for (const item of items) {
    if (item.link === target) return item.link
    if (item.items?.length) {
      const r = findOverviewLink(item.items, target)
      if (r) return r
    }
  }
  return null
}

export function useBreadcrumb() {
  const route = useRoute()
  const { theme, page, frontmatter } = useData()
  const { t } = useI18n()
  const sidebar = computed(() => theme.value.sidebar)

  // 把 sidebar 配置摊平成数组（无论是 record 还是 array）
  const allSidebarItems = computed<DefaultTheme.SidebarItem[]>(() => {
    const s = sidebar.value
    if (!s) return []
    if (Array.isArray(s)) return s
    if (typeof s === 'object') {
      return Object.values(s).flatMap(v => (Array.isArray(v) ? v : []))
    }
    return []
  })

  // 根据 route.path 找出当前 NAV_TAB
  function findTab(currentPath: string) {
    const p = stripLocale(currentPath)
    return NAV_TABS.find(tab =>
      tab.path !== '/' &&
      (p === tab.path || tab.categories.some(c => p.startsWith('/' + c + '/'))),
    )
  }

  // 当前页标题：frontmatter > page.title > sidebar 中查 link > url 末段
  function currentTitleFor(path: string, lastSeg: string): string {
    if (frontmatter.value?.title) return frontmatter.value.title
    if (page.value?.title) return page.value.title
    const fromSidebar = findTitleByLink(allSidebarItems.value, path)
    if (fromSidebar) return fromSidebar
    return lastSeg.replace(/-/g, ' ')
  }

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const homeItem: BreadcrumbItem = {
      text: t('common.home') || 'Home',
      link: '/',
    }
    const currentPath = route.path
    const noLocale = stripLocale(currentPath)
    const localePrefix = currentPath.match(LOCALE_PREFIX_RE)?.[0] ?? ''

    // 当前是主页
    if (noLocale === '/' || noLocale === '') return [homeItem]

    // 1) 拿到当前 tab
    const tab = findTab(currentPath)
    const tabItem: BreadcrumbItem | null = tab
      ? {
        text: t(tab.label) || tab.key,
        link: `${localePrefix}${tab.path}overview`,
      }
      : null

    // 2) 拆出当前路径在 tab 下的「中间段」（剔除最后一段当前页）
    //    e.g. /stock-trading/trading-hours-and-rules/sg-trading-rules
    //    segments = ['stock-trading', 'trading-hours-and-rules', 'sg-trading-rules']
    //    tab 本身是 stock-trading，所以中间段 = ['trading-hours-and-rules']
    const segments = noLocale.replace(/^\/+/, '').split('/').filter(Boolean)
    // 末段是当前页，跳过
    const lastSeg = segments[segments.length - 1] || ''
    const intermediate = segments.slice(0, -1)

    // 3) 每段查 dirNames 显示名；link 优先从 sidebar 找该段 group 的 overview，
    //    没有再回退到 /path/
    const intermediateItems: BreadcrumbItem[] = []
    for (let i = 0; i < intermediate.length; i++) {
      const seg = intermediate[i]
      const key = `data.dirNames.${seg}`
      const translated = t(key)
      const text = translated && translated !== key ? translated : seg
      const subPath = '/' + intermediate.slice(0, i + 1).join('/')
      const overviewLink = findOverviewLink(allSidebarItems.value, `${subPath}/overview`)
      const link = overviewLink
        ? `${localePrefix}${overviewLink}`
        : `${localePrefix}${subPath}/`
      intermediateItems.push({ text, link })
    }

    // 4) 当前页项（无 link）
    const currentTitle = currentTitleFor(currentPath, lastSeg)
    const currentItem: BreadcrumbItem = { text: String(currentTitle) }

    // 5) 拼装：Home / Tab / intermediate.../ current
    const result: BreadcrumbItem[] = [homeItem]
    if (tabItem) result.push(tabItem)
    result.push(...intermediateItems)
    result.push(currentItem)
    return result
  })

  return { breadcrumbItems }
}
