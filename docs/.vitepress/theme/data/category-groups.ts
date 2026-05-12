export interface CategoryItem {
  label: string
  path: string
}

export interface CategoryGroup {
  name: string
  items: CategoryItem[]
}

export const categoryGroups: CategoryGroup[] = [
  {
    name: '交易类',
    items: [
      { label: '股票交易', path: '/zh-CN/stock-trading/' },
      { label: '期权', path: '/zh-CN/derivatives/options/' },
      { label: '窝轮', path: '/zh-CN/derivatives/warrants' },
      { label: '牛熊证', path: '/zh-CN/derivatives/cbbc' },
      { label: '融资融券', path: '/zh-CN/margin/' },
      { label: '新股认购', path: '/zh-CN/ipo/' },
    ],
  },
  {
    name: '理财类',
    items: [
      { label: '基金', path: '/zh-CN/funds-and-wealth/funds/' },
      { label: '活钱通', path: '/zh-CN/funds-and-wealth/cash-plus/' },
      { label: '闲置资金', path: '/zh-CN/funds-and-wealth/' },
      { label: '结构性产品', path: '/zh-CN/funds-and-wealth/' },
    ],
  },
  {
    name: '行情',
    items: [
      { label: '行情套餐', path: '/zh-CN/market-data/' },
      { label: '财务数据', path: '/zh-CN/market-data/' },
      { label: '技术指标', path: '/zh-CN/market-data/' },
      { label: '资金流向', path: '/zh-CN/market-data/' },
    ],
  },
  {
    name: '账户支撑',
    items: [
      { label: '开户账户', path: '/zh-CN/account/' },
      { label: '入金', path: '/zh-CN/deposit/' },
      { label: '出金', path: '/zh-CN/withdrawal/' },
      { label: '资金划转换汇', path: '/zh-CN/transfers-and-fx/' },
      { label: '资产与对账', path: '/zh-CN/portfolio-and-statements/' },
    ],
  },
  {
    name: '帮助',
    items: [
      { label: 'App 导览', path: '/zh-CN/app-guide/' },
      { label: '合规与税务', path: '/zh-CN/compliance-and-tax/' },
      { label: '故障排查', path: '/zh-CN/troubleshooting/' },
      { label: '活动奖励', path: '/zh-CN/rewards/' },
    ],
  },
]
