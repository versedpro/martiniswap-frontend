import { ReactNode } from 'react'
import { styled } from 'styled-components'
import { AtomBox, AtomBoxProps, SwapCSS } from '@pancakeswap/uikit'

import { SwapFooter } from './Footer'

type SwapPageProps = AtomBoxProps & {
  removePadding?: boolean
  hideFooterOnDesktop?: boolean
  noMinHeight?: boolean
  helpUrl?: string
  helpImage?: ReactNode
  externalText?: string
  externalLinkUrl?: string
}

const StyledPage = styled.div`
  background-image: url('/images/planet-pluto.png');
  background-repeat: no-repeat;
  background-position: bottom center;
`

export const SwapPage = ({
  removePadding,
  noMinHeight,
  children,
  hideFooterOnDesktop,
  helpUrl,
  helpImage,
  externalText,
  externalLinkUrl,
  ...props
}: SwapPageProps) => (
  <StyledPage>
    <AtomBox className={SwapCSS.pageVariants({ removePadding, noMinHeight })} {...props}>
      {children}
      <AtomBox display="flex" flexGrow={1} />
      <AtomBox display={['block', null, null, hideFooterOnDesktop ? 'none' : 'block']} width="100%">
        <SwapFooter
          externalText={externalText}
          externalLinkUrl={externalLinkUrl}
          helpUrl={helpUrl}
          helpImage={helpImage}
        />
      </AtomBox>
    </AtomBox>
  </StyledPage>
)
