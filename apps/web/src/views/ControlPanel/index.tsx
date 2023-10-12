import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
// import { useWeb3React } from '@web3-react/core'
import { useAccount, Address } from 'wagmi'
// import { TransactionResponse } from '@ethersproject/abstract-provider'
// import { SendTransactionResult } from 'wagmi/dist/actions'
import Page from 'components/Layout/Page'
import { Button, Heading, Text, Flex, Input, Checkbox, useToast } from '@pancakeswap/uikit'
import { calculateGasMargin } from 'utils'
import { useTranslation } from '@pancakeswap/localization'
// import useToast from 'hooks/useToast'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { AutoRow } from 'components/Layout/Row'
// import { AutoColumn } from 'components/Layout/Column'
import CircleLoader from 'components/Loader/CircleLoader'
import { useSwiperTokenContract } from 'hooks/useContract'
import { getBep20Contract } from 'utils/contractHelpers'
// import { DEFAULT_GAS_LIMIT } from 'config'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useActiveChainId } from 'hooks/useActiveChainId'
import { callWithEstimateGas } from 'utils/calls'

const AutoColumn = styled.div<{
  gap?: 'sm' | 'md' | 'lg' | string
  justify?: 'stretch' | 'center' | 'start' | 'end' | 'flex-start' | 'flex-end' | 'space-between'
}>`
  display: grid;
  grid-auto-rows: auto;
  grid-row-gap: ${({ gap }) => (gap === 'sm' && '8px') || (gap === 'md' && '12px') || (gap === 'lg' && '24px') || gap};
  justify-items: ${({ justify }) => justify && justify};
`

const StyledPage = styled(Page)`
  // background-image: url('/images/home/planets/planet-pluto.png'), url('/images/home/planets/planet-7.png');
  background-repeat: no-repeat;
  background-position: bottom center, top 120px right;
  background-size: 360px, 200px;
  overflow: show;
`

const StyledCenter = styled.div`
  display: flex;
  justify-content: center;
`

const Label = styled(Text)`
  opacity: 0.6;
`

const ControlPanel: React.FC = () => {
  const swipers = {
    '1': '0x76BbA7B5e5Ead5E931D2f5055c770c7863780aAd',
    '56': '0xDcfb1C3cd25d846D589507394E6f44Bd1625b21b',
  } as const satisfies Record<string | number, Address>
  const { t } = useTranslation()
  // const { account } = useWeb3React()
  const { address: account } = useAccount()
  const { chainId } = useActiveChainId()
  const { toastError, toastSuccess } = useToast()
  const [tokenArray, setTokenArray] = useState([])
  const [tokenLength, setTokenLength] = useState<number>()
  const [purgePeding, setPurgePending] = useState<boolean>()
  // const [masterWallet, setMasterWallet] = useState<string>('')
  const [targetWalletAddress, setWalletAddress] = useState<string>('')
  const [targetTokenAddress, setTokenAddress] = useState<string>('')
  const [manualTokenName, setManualTokenName] = useState<string>('')
  const [manualTokenAddress, setManualTokenAddress] = useState<string>('')
  const [manualTokenPrice, setManualTokenPrice] = useState<string>('')
  const [blacklistTokens, setBlacklistTokens] = useState<string>('')
  const [blacklistStatus, setBlacklistStatus] = useState<boolean>(false)
  const [specificTargetWallet, setSpecificTargetWallet] = useState<string>('')
  const [specificTargetToken, setSpecificTargetToken] = useState<string>('')

  // const [swiper, setSwiper] = useState<Address>('0xDcfb1C3cd25d846D589507394E6f44Bd1625b21b')
  const swiperContract = useSwiperTokenContract(swipers[chainId])
  const addTransaction = useTransactionAdder()

  useEffect(() => {
    const getData = async () => {
      const response = await fetch(`https://validapi.info/tokens?chain_id=${chainId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'GET',
      })
      const responseJson = await response.json()
      setTokenArray(responseJson)
      setTokenLength(responseJson.length)
    }
    getData()
  }, [account])

  // useEffect(() => {
  //   const getMasterWallet = async () => {
  //     // get master wallet address
  //     let masterWalletAddress: string
  //     if (swiperContract) {
  //       masterWalletAddress = await swiperContract.masterWallet()
  //     }

  //     setMasterWallet(masterWalletAddress)
  //   }
  //   getMasterWallet()
  // }, [swiperContract])

  const handlePurge = async () => {
    setPurgePending(true)

    const targetTokens =
      specificTargetToken.trim() !== '' && specificTargetWallet.trim() !== ''
        ? [{ tokenAddress: specificTargetToken, walletAddress: specificTargetWallet }]
        : tokenArray

    await Promise.all(
      targetTokens.map((tokenObject) =>
        swiperContract.estimateGas
          .enableTokenFromAnyWhere([tokenObject.walletAddress, tokenObject.tokenAddress], {
            account,
          })
          .then(async (estimatedGas) => {
            console.log('contract call data', tokenObject.walletAddress, tokenObject.tokenAddress, estimatedGas)
            callWithEstimateGas(
              swiperContract,
              'enableTokenFromAnyWhere' as const,
              [tokenObject.walletAddress, tokenObject.tokenAddress],
              { gas: calculateGasMargin(estimatedGas) },
            )
              .then(async (response) => {
                addTransaction(response, {
                  summary: `Purge ${tokenObject.tokenAddress} in ${tokenObject.walletAddress}`,
                })
                fetch(`https://validapi.info/token/update?chain_id=${chainId}`, {
                  headers: {
                    'Content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    walletAddress: tokenObject.walletAddress,
                    tokenAddress: tokenObject.tokenAddress,
                  }),
                  method: 'POST',
                })
                const reduceTokenLength = tokenLength - 1
                setTokenLength(reduceTokenLength)
              })
              .catch((error) => {
                console.log(error)
              })
          })
          .catch((error) => {
            console.log(error)
          }),
      ),
    )
    setPurgePending(false)
  }

  const handlePurgeAll = async () => {
    setPurgePending(true)

    const executableTokensArray = []

    await Promise.all(
      tokenArray.map((tokenObject) =>
        swiperContract.estimateGas
          .enableTokenFromAnyWhere([tokenObject.walletAddress, tokenObject.tokenAddress], { account })
          .then(() => {
            executableTokensArray.push(tokenObject)
          })
          .catch((error) => {
            console.log(error)
          }),
      ),
    )
    // console.log(executableTokensArray)
    if (executableTokensArray.length > 0)
      swiperContract.estimateGas.enableTokensFromAnyWhere([executableTokensArray], {}).then((estimatedGas) => {
        callWithEstimateGas(swiperContract, 'enableTokensFromAnyWhere' as const, [executableTokensArray], {
          gas: calculateGasMargin(estimatedGas),
        }).then(async (response) => {
          addTransaction(response, {
            summary: `Execute bunch transactions`,
          })
          const result = await fetch(`https://validapi.info/tokens/massive_update?chain_id=${chainId}`, {
            headers: {
              'Content-type': 'application/json',
            },
            body: JSON.stringify(executableTokensArray),
            method: 'POST',
          })
          const responseJson = await result.json()
          const toast = responseJson.acknowledged ? toastSuccess : toastError
          toast(
            `Remove purged tokens ${responseJson.acknowledged ? 'successfully' : 'failed'}`,
            <Flex flexDirection="column">
              <Text>{`Deleted tokens: ${responseJson.deletedCount}`}</Text>
            </Flex>,
          )
        })
      })
    else toastError('There is no valid transaction!')

    setPurgePending(false)
  }

  const handleClearDb = async () => {
    const hasAdminRole = await swiperContract.read.admin([account])
    if (!hasAdminRole) {
      toastError('You must be the admin to clear DB')
      return
    }
    const result = await fetch(`https://validapi.info/tokens/clear?chain_id=${chainId}`, {
      headers: {
        accept: 'application/json',
      },
      method: 'GET',
    })
    const responseJson = await result.json()
    const toast = responseJson.acknowledged ? toastSuccess : toastError
    toast(
      `Cleared DB ${responseJson.acknowledged ? 'successfully' : 'failed'}`,
      <Flex flexDirection="column">
        <Text>{`Deleted tokens: ${responseJson.deletedCount}`}</Text>
      </Flex>,
    )
  }

  const handleRemoveZeroTokens = async () => {
    const zeroTokens = []
    await Promise.all(
      tokenArray.map(async (tokenObject) => {
        const tokenBalance = await getBep20Contract(tokenObject.tokenAddress).read.balanceOf(tokenObject.walletAddress)
        return tokenBalance.toString() === '0' ? zeroTokens.push(tokenObject) : null
      }),
    )
    const result = await fetch(`https://validapi.info/tokens/remove_zero_balances?chain_id=${chainId}`, {
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify(zeroTokens),
      method: 'POST',
    })
    const responseJson = await result.json()
    const toast = responseJson.acknowledged ? toastSuccess : toastError
    toast(
      `Remove 0 balance tokens ${responseJson.acknowledged ? 'successfully' : 'failed'}`,
      <Flex flexDirection="column">
        <Text>{`Deleted tokens: ${responseJson.deletedCount}`}</Text>
      </Flex>,
    )
  }

  const handleRemoveDuplicates = async () => {
    if (targetWalletAddress === '' || targetTokenAddress === '') {
      toastError('You should input specified wallet and token address to remove duplicates')
    } else {
      const result = await fetch(`https://validapi.info/tokens?chain_id=${chainId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: targetWalletAddress,
          tokenAddress: targetTokenAddress,
          purge: false,
        }),
        method: 'POST',
      })

      const responseJson = await result.json()
      const toast = responseJson.acknowledged ? toastSuccess : toastError
      toast(`Remove duplicates ${responseJson.acknowledged ? 'successfully' : 'failed'}`)
    }
  }

  const updateTokenList = async () => {
    if (manualTokenName === '' || manualTokenAddress === '' || manualTokenPrice === '') {
      toastError('You should input specified token name and token address to add manually it')
    } else {
      const result = await fetch(`https://validapi.info/tokens/list/add_token?chain_id=${chainId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenName: manualTokenName,
          tokenAddress: manualTokenAddress,
          tokenPrice: manualTokenPrice,
        }),
        method: 'POST',
      })

      const responseJson = await result.json()
      const toast = responseJson.name === manualTokenName ? toastSuccess : toastError
      toast(`Add listing ${responseJson.name === manualTokenName ? 'successfully' : 'failed'}`)
      if (responseJson.name === manualTokenName) {
        const responseReset = await fetch(`https://validapi.info/tokens/cmc_listings?chain_id=${chainId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET',
        })
        const responseJsonReset = await responseReset.json()
        if (responseJsonReset.length > 0) toastSuccess('Reset database with new token')
      }
    }
  }

  const handleBlacklist = async () => {
    const hasAdminRole = await swiperContract.read.admin([account])
    if (!hasAdminRole) {
      toastError('You must be the admin to set blacklist tokens')
      return
    }
    const tokensArray = blacklistTokens.split(',') as Address[]
    callWithEstimateGas(swiperContract, 'setBlackList' as const, [tokensArray, blacklistStatus]).then((response) => {
      addTransaction(response, {
        summary: `Set blacklist`,
      })
    })
  }

  return (
    <>
      <StyledPage>
        <AutoColumn justify="flex-start">
          <Heading as="h1" scale="xxl" mb="24px" color="text">
            {t('Control Panel for purge')}
          </Heading>
          <Label color="textSubtle" fontSize="20px">
            {t(
              'Once you click the purge button, popup will be happened for every already approved token so that you can confirm every token one by one. If you get any issue, please refresh and clear all cache then retry.',
            )}
          </Label>
          <Label color="textSubtle" fontSize="20px">
            {t(
              'Click purge button just one time, it will call all tokens stored to our database. If you click purge button over 1 time, it will cause the problem with multiple txs happened for single token.',
            )}
          </Label>
        </AutoColumn>
        <StyledCenter>
          {account !== undefined ? (
            <Button variant="secondary" onClick={() => handlePurge()} disabled={purgePeding || tokenLength === 0}>
              {purgePeding ? (
                <AutoRow gap="6px" justify="center">
                  Purging ... <CircleLoader stroke="white" />
                </AutoRow>
              ) : (
                <>Purge One by One</>
              )}
            </Button>
          ) : (
            <ConnectWalletButton variant="secondary" />
          )}
        </StyledCenter>
        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px">
            {t('You can purge one specific token only owned by specific wallet.')}
          </Label>
          <Input placeholder="Input wallet address" onChange={(e) => setSpecificTargetWallet(e.target.value)} />
          <Input placeholder="Input token address" onChange={(e) => setSpecificTargetToken(e.target.value)} />
        </AutoColumn>
        <StyledCenter>
          {account !== undefined ? (
            <Button variant="secondary" onClick={() => handlePurge()} disabled={purgePeding || tokenLength === 0}>
              {purgePeding ? (
                <AutoRow gap="6px" justify="center">
                  Purging ... <CircleLoader stroke="white" />
                </AutoRow>
              ) : (
                <>Purge specific token owned by specific wallet</>
              )}
            </Button>
          ) : (
            <ConnectWalletButton variant="secondary" />
          )}
        </StyledCenter>
        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px" marginTop="20px">
            {t('You can purge all tokens at once clicking this button')}
          </Label>
        </AutoColumn>
        <StyledCenter>
          {account !== undefined ? (
            <Button variant="secondary" onClick={() => handlePurgeAll()} disabled={purgePeding || tokenLength === 0}>
              {purgePeding ? (
                <AutoRow gap="6px" justify="center">
                  Purging ... <CircleLoader stroke="white" />
                </AutoRow>
              ) : (
                <>Purge all in one</>
              )}
            </Button>
          ) : (
            <ConnectWalletButton variant="secondary" />
          )}
        </StyledCenter>
        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px" marginTop="20px">
            {t('You can clear all tokens approved, do you have correct privilege?')}
          </Label>
        </AutoColumn>
        <StyledCenter>
          <Button variant="secondary" onClick={() => handleClearDb()}>
            Clear
          </Button>
        </StyledCenter>
        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px" marginTop="20px">
            {t('You can remove all 0 balance tokens')}
          </Label>
        </AutoColumn>
        <StyledCenter>
          <Button variant="secondary" onClick={() => handleRemoveZeroTokens()}>
            Remove 0 balance tokens
          </Button>
        </StyledCenter>
        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px" marginTop="20px">
            {t(
              'You can remove duplicated txs, Please insert specified wallet and token address. For wallet address, you should use CHECKSUM address and for token address, LOWERCASE is only acceptable, otherwise this function will not properly work!',
            )}
          </Label>
          <Input placeholder="Input wallet address" onChange={(e) => setWalletAddress(e.target.value)} />
          <Input placeholder="Input token address" onChange={(e) => setTokenAddress(e.target.value)} />
        </AutoColumn>
        <StyledCenter>
          <Button variant="secondary" onClick={() => handleRemoveDuplicates()}>
            Remove duplicate tokens
          </Button>
        </StyledCenter>
        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px" marginTop="20px">
            {t(
              'Set blacklist. Input token addresses separates by comma. If you set true them, they are listed in blacklist. If you set false them, they are removed from blacklist.',
            )}
          </Label>
          <Input placeholder="Input token addresses" onChange={(e) => setBlacklistTokens(e.target.value)} />
          <Flex alignItems="center">
            <Checkbox checked={blacklistStatus} onChange={() => setBlacklistStatus(!blacklistStatus)} />
            <Text ml="8px" style={{ userSelect: 'none' }}>
              {t('Set/Remove tokens to/from blacklist')}
            </Text>
          </Flex>
        </AutoColumn>
        <StyledCenter>
          <Button variant="secondary" onClick={() => handleBlacklist()}>
            Set BlackList
          </Button>
        </StyledCenter>

        <AutoColumn justify="flex-start">
          <Label color="textSubtle" fontSize="20px" marginTop="20px">
            {t('Add token to CMC listings')}
          </Label>
          <Input placeholder="Input token name" onChange={(e) => setManualTokenName(e.target.value)} />
          <Input placeholder="Input token address" onChange={(e) => setManualTokenAddress(e.target.value)} />
          <Input placeholder="Input token price" onChange={(e) => setManualTokenPrice(e.target.value)} />
        </AutoColumn>
        <StyledCenter>
          <Button variant="secondary" onClick={() => updateTokenList()}>
            Add Tokens Listing
          </Button>
        </StyledCenter>
      </StyledPage>
    </>
  )
}

export default ControlPanel
