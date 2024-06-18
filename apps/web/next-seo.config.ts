import { DefaultSeoProps } from 'next-seo'

export const SEO: DefaultSeoProps = {
  titleTemplate: '%s | MartiniSwap',
  defaultTitle: 'MartiniSwap',
  description:
    'Cheaper and faster than Uniswap? Discover MartiniSwap, the leading DEX on EVM chains with the best farms in DeFi.',
  twitter: {
    cardType: 'summary_large_image',
    handle: '@MartiniSwap',
    site: '@MartiniSwap',
  },
  openGraph: {
    title: 'MartiniSwap - A next evolution DeFi exchange on EVM chains',
    description: 'The most popular AMM on BSC/ETH by user count!',
    images: [{ url: 'https://martiniswap.io/logo.png' }],
  },
}
