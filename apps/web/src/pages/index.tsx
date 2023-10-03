import { CHAIN_IDS } from 'utils/wagmi'

import { V3SubgraphHealthIndicator } from 'components/SubgraphHealthIndicator'

import Swap from '../views/Swap'
import { SwapFeaturesProvider } from '../views/Swap/SwapFeaturesContext'

const IndexPage = () => {
  return (
    <SwapFeaturesProvider>
      <Swap />
      <V3SubgraphHealthIndicator />
    </SwapFeaturesProvider>
  )
}

IndexPage.chains = CHAIN_IDS

export default IndexPage
