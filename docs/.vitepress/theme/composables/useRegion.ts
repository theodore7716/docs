import { ref } from 'vue'
import { inBrowser, withBase } from 'vitepress'

// region 来自 cookie（HomeNavbar 中写入），fallback 到当前 URL 第一段，再 fallback 'hk'。
// 单次 build 内 region 是恒定的（VitePress base = /<region>/）。useRegion 主要给跨 region
// 跳转用：构造目标 region 的绝对 URL。
function readRegion(): 'hk' | 'sg' {
  if (!inBrowser) return 'hk'
  const m = document.cookie.match(/(?:^|; )region=([^;]*)/)
  if (m && (m[1] === 'sg' || m[1] === 'hk')) return m[1]
  const p = window.location.pathname.match(/^\/(hk|sg)(\/|$)/)
  return p ? (p[1] as 'hk' | 'sg') : 'hk'
}

export function useRegion() {
  const region = ref<'hk' | 'sg'>(readRegion())

  // 当前 region 内的路径：直接走 vitepress withBase（base 已 = /<region>/）。
  // 适合 <a :href> 这种非 router-link 的硬链接。
  function withRegion(href: string | undefined | null): string {
    if (!href) return ''
    if (/^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('#')) return href
    if (!href.startsWith('/')) return href
    return withBase(href)
  }

  // 跨 region 跳转：忽略当前 base，直接构造目标 region 的绝对 URL
  function toRegion(target: 'hk' | 'sg', pathWithinRegion = '/'): string {
    const rest = pathWithinRegion.startsWith('/') ? pathWithinRegion : '/' + pathWithinRegion
    return `/${target}${rest === '/' ? '/' : rest}`
  }

  return { region, withRegion, toRegion }
}
