import { CHAIN_IDS } from 'utils/wagmi'

import ControlPanel from '../views/ControlPanel'

const ControlPanelPage = () => {
  return <ControlPanel />
}

ControlPanelPage.chains = CHAIN_IDS

export default ControlPanelPage
