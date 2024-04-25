import { DefaultSeoProps } from 'next-seo'

export const SEO: DefaultSeoProps = {
  titleTemplate: '%s | VortexSwap',
  defaultTitle: 'VortexSwap',
  description:
    'Cheaper and faster than Uniswap? Discover VortexSwap, the leading DEX on EVM chains with the best farms in DeFi.',
  twitter: {
    cardType: 'summary_large_image',
    handle: '@VortexSwap',
    site: '@VortexSwap',
  },
  openGraph: {
    title: 'VortexSwap - A next evolution DeFi exchange on EVM chains',
    description: 'The most popular AMM on BSC/ETH by user count!',
    images: [{ url: 'https://vortexswap.finance/logo.png' }],
  },
}
