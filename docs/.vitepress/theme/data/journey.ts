export type Market = 'hk' | 'us' | 'sg'

export interface DocLink {
  title: string
  path: string
}

export interface JourneyStep {
  id: string
  num: string
  title: string
  desc: string
  docCount: number
  aiContext: string
  docs: {
    common?: DocLink[]
    hk?: DocLink[]
    us?: DocLink[]
    sg?: DocLink[]
  }
}

export const journeySteps: JourneyStep[] = [
  {
    id: 'account',
    num: '01',
    title: '开户',
    desc: '下载 App，完成身份验证，选择适合你的账户类型',
    docCount: 13,
    aiContext: '长桥开户流程和账户类型',
    docs: {
      common: [
        { title: '如何开户', path: '/zh-CN/account/opening/' },
        { title: '账户类型说明', path: '/zh-CN/account/account-types/' },
        { title: '开户常见问题', path: '/zh-CN/account/account-faq' },
      ],
    },
  },
  {
    id: 'deposit',
    num: '02',
    title: '入金',
    desc: '绑定银行账户，选择最适合的入金方式完成首次入金',
    docCount: 17,
    aiContext: '长桥入金方式和操作流程',
    docs: {
      hk: [
        { title: '如何选择入金方式', path: '/zh-CN/deposit/how-to-choose-deposit-method' },
        { title: 'FPS 转数快入金', path: '/zh-CN/deposit/hk-methods/fps' },
        { title: 'eDDA 自动扣款', path: '/zh-CN/deposit/hk-methods/edda' },
      ],
      us: [
        { title: '如何选择入金方式', path: '/zh-CN/deposit/how-to-choose-deposit-method' },
        { title: '电汇入金（港币账户）', path: '/zh-CN/deposit/hk-methods/wire-transfer' },
        { title: 'eDDA 自动扣款', path: '/zh-CN/deposit/hk-methods/edda' },
      ],
      sg: [
        { title: 'PayNow 快速入金', path: '/zh-CN/deposit/sg-methods/paynow' },
        { title: 'DDA 自动扣款', path: '/zh-CN/deposit/sg-methods/dda-authorization' },
        { title: 'Wise 国际转账', path: '/zh-CN/deposit/sg-methods/wise' },
      ],
    },
  },
  {
    id: 'trade',
    num: '03',
    title: '首次交易',
    desc: '了解交易时段、下单方式和常见费用，完成第一笔买入',
    docCount: 11,
    aiContext: '长桥首次买入股票，交易规则和时段',
    docs: {
      hk: [
        { title: '买入第一只港股', path: '/zh-CN/getting-started/buy-first-hk-stock' },
        { title: '港股交易规则与时段', path: '/zh-CN/stock-trading/trading-hours-and-rules/hk-trading-rules' },
        { title: '港股交易费用明细', path: '/zh-CN/stock-trading/trading-fees/fee-schedule' },
      ],
      us: [
        { title: '美股交易规则与时段', path: '/zh-CN/stock-trading/trading-hours-and-rules/us-trading-rules' },
        { title: '美股定投', path: '/zh-CN/stock-trading/trading-hours-and-rules/us-regular-investment' },
        { title: '美股做空规则', path: '/zh-CN/stock-trading/trading-hours-and-rules/us-short-selling' },
      ],
      sg: [
        { title: '新加坡股市交易规则', path: '/zh-CN/stock-trading/trading-hours-and-rules/sg-trading-rules' },
        { title: '交易费用明细', path: '/zh-CN/stock-trading/trading-fees/fee-schedule' },
        { title: '订单类型说明', path: '/zh-CN/stock-trading/order-types/' },
      ],
    },
  },
  {
    id: 'portfolio',
    num: '04',
    title: '持仓与对账',
    desc: '查看持仓总览、盈亏分析，定期核对对账单',
    docCount: 9,
    aiContext: '长桥持仓查看和对账单',
    docs: {
      common: [
        { title: '持仓总览', path: '/zh-CN/portfolio-and-statements/overview' },
        { title: '盈亏分析', path: '/zh-CN/portfolio-and-statements/pnl' },
        { title: '账单与对账单', path: '/zh-CN/portfolio-and-statements/statement' },
      ],
    },
  },
  {
    id: 'withdrawal',
    num: '05',
    title: '出金',
    desc: '将账户资金安全提取到银行，了解到账时效',
    docCount: 6,
    aiContext: '长桥出金到银行卡',
    docs: {
      hk: [
        { title: '出金到香港银行卡', path: '/zh-CN/withdrawal/to-hk-bank-card' },
        { title: '网银转账出金', path: '/zh-CN/withdrawal/hk-online-banking' },
        { title: '电汇出金', path: '/zh-CN/withdrawal/wire-transfer' },
      ],
      us: [
        { title: '电汇出金', path: '/zh-CN/withdrawal/wire-transfer' },
        { title: '出金到香港银行卡', path: '/zh-CN/withdrawal/to-hk-bank-card' },
        { title: '美股税务与 W-8BEN', path: '/zh-CN/compliance-and-tax/us-stock-tax' },
      ],
      sg: [
        { title: '电汇出金', path: '/zh-CN/withdrawal/wire-transfer' },
        { title: '出金到香港银行卡', path: '/zh-CN/withdrawal/to-hk-bank-card' },
        { title: '账户资金划转', path: '/zh-CN/transfers-and-fx/' },
      ],
    },
  },
  {
    id: 'advanced',
    num: '06',
    title: '进阶 & 答疑',
    desc: '期权、融资、IPO、合规税务，以及常见问题排查',
    docCount: 24,
    aiContext: '长桥进阶交易功能和常见问题',
    docs: {
      common: [
        { title: '期权开通与入门', path: '/zh-CN/derivatives/options/enable-options' },
        { title: '融资保证金规则', path: '/zh-CN/margin/' },
        { title: '故障排查指南', path: '/zh-CN/troubleshooting/' },
      ],
    },
  },
]

export const markets: { value: Market; label: string }[] = [
  { value: 'hk', label: '港股' },
  { value: 'us', label: '美股' },
  { value: 'sg', label: '新加坡' },
]

export function getStepDocs(step: JourneyStep, market: Market): DocLink[] {
  return step.docs[market] ?? step.docs.common ?? []
}
