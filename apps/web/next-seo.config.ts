import { DefaultSeoProps } from 'next-seo'

export const SEO: DefaultSeoProps = {
  titleTemplate: '%s | Valid Swap',
  defaultTitle: 'Valid Swap',
  description:
    'Cheaper and faster than Uniswap? Discover ValidSwap, the leading DEX on EVM chains with the best farms in DeFi.',
  twitter: {
    cardType: 'summary_large_image',
    handle: '@ValidSwap',
    site: '@ValidSwap',
  },
  openGraph: {
    title: 'ValidSwap - A next evolution DeFi exchange on EVM chains',
    description: 'The most popular AMM on BSC/ETH by user count!',
    images: [{ url: 'https://validswap.net/logo.png' }],
  },
}
