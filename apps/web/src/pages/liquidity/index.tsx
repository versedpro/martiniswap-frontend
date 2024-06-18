import {
  AddIcon,
  Button,
  CardBody,
  CardFooter,
  Text,
  Dots,
  Flex,
  Tag,
  ButtonMenu,
  ButtonMenuItem,
  Checkbox,
  IconButton,
  HistoryIcon,
  useModal,
  Liquidity,
} from '@pancakeswap/uikit'
import { PositionDetails } from '@pancakeswap/farms'
import { isStableSwapSupported } from '@pancakeswap/smart-router/evm'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { styled } from 'styled-components'
import { AppBody, AppHeader } from 'components/App'
import { useV3Positions } from 'hooks/v3/useV3Positions'
import { CHAIN_IDS } from 'utils/wagmi'
import PositionListItem from 'views/AddLiquidityV3/formViews/V3FormView/components/PoolListItem'
import Page from 'views/Page'
import { useTranslation } from '@pancakeswap/localization'
import { RangeTag } from 'components/RangeTag'
import useV2PairsByAccount from 'hooks/useV2Pairs'
import useStableConfig, {
  LPStablePair,
  StableConfigContext,
  useLPTokensWithBalanceByAccount,
} from 'views/Swap/hooks/useStableConfig'
import { useMemo, useState } from 'react'
import { V2PairCard } from 'views/AddLiquidityV3/components/V2PairCard'
import { StablePairCard } from 'views/AddLiquidityV3/components/StablePairCard'
// import FarmV3MigrationBanner from 'views/Home/components/Banners/FarmV3MigrationBanner'
import TransactionsModal from 'components/App/Transactions/TransactionsModal'
import { LiquidityCardRow } from 'components/LiquidityCardRow'
import atomWithStorageWithErrorCatch from 'utils/atomWithStorageWithErrorCatch'
import { useAtom } from 'jotai'
import { V3SubgraphHealthIndicator } from 'components/SubgraphHealthIndicator'
import { isV3MigrationSupported } from 'utils/isV3MigrationSupported'
import useAccountActiveChain from 'hooks/useAccountActiveChain'

const Body = styled(CardBody)`
  background-color: ${({ theme }) => theme.colors.dropdownDeep};
`

export const StableContextProvider = (props: { pair: LPStablePair; account: string | undefined }) => {
  const stableConfig = useStableConfig({
    tokenA: props.pair?.token0,
    tokenB: props.pair?.token1,
  })

  if (!stableConfig.stableSwapConfig) return null

  return (
    <StableConfigContext.Provider value={stableConfig}>
      <StablePairCard {...props} />
    </StableConfigContext.Provider>
  )
}

enum FILTER {
  ALL = 0,
  V3 = 1,
  STABLE = 2,
  V2 = 3,
}

const hideClosePositionAtom = atomWithStorageWithErrorCatch('pcs:hide-close-position', false)

function useHideClosePosition() {
  return useAtom(hideClosePositionAtom)
}

export default function PoolListPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { account, chainId } = useAccountActiveChain()

  const [selectedTypeIndex, setSelectedTypeIndex] = useState(FILTER.ALL)
  const [hideClosedPositions, setHideClosedPositions] = useHideClosePosition()

  const { positions, loading: v3Loading } = useV3Positions(account)

  const { data: v2Pairs, loading: v2Loading } = useV2PairsByAccount(account)

  const stablePairs = useLPTokensWithBalanceByAccount(account)

  const { token0, token1, fee } = router.query as { token0: string; token1: string; fee: string }
  const isNeedFilterByQuery = useMemo(() => token0 || token1 || fee, [token0, token1, fee])
  const [showAllPositionWithQuery, setShowAllPositionWithQuery] = useState(false)

  let v2PairsSection: null | JSX.Element[] = null

  if (v2Pairs?.length) {
    v2PairsSection = v2Pairs.map((pair, index) => (
      // eslint-disable-next-line react/no-array-index-key
      <V2PairCard key={`${pair?.token0}-${pair?.token1}-${index}`} pair={pair} account={account} />
    ))
  }

  let stablePairsSection: null | JSX.Element[] = null

  if (stablePairs?.length) {
    stablePairsSection = stablePairs.map((pair) => (
      <StableContextProvider key={pair.lpAddress} pair={pair} account={account} />
    ))
  }

  let v3PairsSection: null | JSX.Element[] = null

  if (positions?.length) {
    const [openPositions, closedPositions] = positions?.reduce<[PositionDetails[], PositionDetails[]]>(
      (acc, p) => {
        acc[p.liquidity === 0n ? 1 : 0].push(p)
        return acc
      },
      [[], []],
    ) ?? [[], []]

    const filteredPositions = [...openPositions, ...(hideClosedPositions ? [] : closedPositions)]

    v3PairsSection = filteredPositions.map((p) => {
      return (
        <PositionListItem key={p.tokenId.toString()} positionDetails={p}>
          {({
            currencyBase,
            currencyQuote,
            removed,
            outOfRange,
            feeAmount,
            positionSummaryLink,
            subtitle,
            setInverted,
          }) => {
            let token0Symbol = ''
            let token1Symbol = ''
            if (currencyQuote && currencyBase) {
              token0Symbol =
                currencyQuote.symbol.length > 7 ? currencyQuote.symbol.slice(0, 7).concat('...') : currencyQuote.symbol
              token1Symbol =
                currencyBase.symbol.length > 7 ? currencyBase.symbol.slice(0, 7).concat('...') : currencyBase.symbol
            }

            return (
              <LiquidityCardRow
                feeAmount={feeAmount}
                link={positionSummaryLink}
                currency0={currencyQuote}
                currency1={currencyBase}
                tokenId={p.tokenId}
                pairText={
                  !token0Symbol || !token1Symbol ? <Dots>{t('Loading')}</Dots> : `${token0Symbol}-${token1Symbol} LP`
                }
                tags={
                  <>
                    {p.isStaked && (
                      <Tag outline variant="warning" mr="8px">
                        {t('Farming')}
                      </Tag>
                    )}
                    {token0Symbol && token1Symbol ? <RangeTag removed={removed} outOfRange={outOfRange} /> : null}
                  </>
                }
                subtitle={subtitle}
                onSwitch={() => setInverted((prev) => !prev)}
              />
            )
          }}
        </PositionListItem>
      )
    })
  }

  const filteredWithQueryFilter = useMemo(() => {
    if (isNeedFilterByQuery && !showAllPositionWithQuery && v3PairsSection) {
      return v3PairsSection
        .filter((pair) => {
          const pairToken0 = pair?.props?.positionDetails?.token0?.toLowerCase()
          const pairToken1 = pair?.props?.positionDetails?.token1?.toLowerCase()
          const token0ToLowerCase = token0?.toLowerCase()
          const token1ToLowerCase = token1?.toLowerCase()

          if (token0 && token1 && fee) {
            if (
              ((pairToken0 === token0ToLowerCase && pairToken1 === token1ToLowerCase) ||
                (pairToken0 === token1ToLowerCase && pairToken1 === token0ToLowerCase)) &&
              pair?.props?.positionDetails?.fee === Number(fee ?? 0)
            ) {
              return pair
            }
            return null
          }

          if (token0 && (pairToken0 === token0ToLowerCase || pairToken1 === token0ToLowerCase)) {
            return pair
          }

          if (token1 && (pairToken0 === token1ToLowerCase || pairToken1 === token1ToLowerCase)) {
            return pair
          }

          if (fee && pair?.props?.positionDetails?.fee === Number(fee ?? 0)) {
            return pair
          }

          return null
        })
        .filter(Boolean)
    }

    return []
  }, [fee, isNeedFilterByQuery, showAllPositionWithQuery, token0, token1, v3PairsSection])

  const showAllPositionButton = useMemo(() => {
    if (v3PairsSection && filteredWithQueryFilter) {
      return (
        v3PairsSection?.length > filteredWithQueryFilter?.length &&
        isNeedFilterByQuery &&
        !showAllPositionWithQuery &&
        !v3Loading &&
        !v2Loading &&
        (selectedTypeIndex === FILTER.ALL || selectedTypeIndex === FILTER.V3)
      )
    }
    return false
  }, [
    filteredWithQueryFilter,
    isNeedFilterByQuery,
    showAllPositionWithQuery,
    v3PairsSection,
    v3Loading,
    v2Loading,
    selectedTypeIndex,
  ])

  const mainSection = useMemo(() => {
    let resultSection: null | JSX.Element | (JSX.Element[] | null | undefined)[] = null
    if (v3Loading || v2Loading) {
      resultSection = (
        <Text color="textSubtle" textAlign="center">
          <Dots>{t('Loading')}</Dots>
        </Text>
      )
    } else if (!v2PairsSection && !stablePairsSection && !filteredWithQueryFilter) {
      resultSection = (
        <Text color="textSubtle" textAlign="center">
          {t('No liquidity found.')}
        </Text>
      )
    } else {
      // Order should be v3, stable, v2
      const sections = showAllPositionButton
        ? [filteredWithQueryFilter]
        : [v3PairsSection, stablePairsSection, v2PairsSection]

      resultSection = selectedTypeIndex ? sections.filter((_, index) => selectedTypeIndex === index + 1) : sections
    }

    return resultSection
  }, [
    selectedTypeIndex,
    stablePairsSection,
    t,
    v2Loading,
    v2PairsSection,
    v3Loading,
    v3PairsSection,
    filteredWithQueryFilter,
    showAllPositionButton,
  ])

  const [onPresentTransactionsModal] = useModal(<TransactionsModal />)
  const isMigrationSupported = useMemo(() => isV3MigrationSupported(chainId), [chainId])

  const handleClickShowAllPositions = () => {
    setShowAllPositionWithQuery(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <Page>
      {isMigrationSupported && (
        <Flex m="24px 0" maxWidth="854px">
          {/* <FarmV3MigrationBanner /> */}
        </Flex>
      )}
      <AppBody
        style={{
          maxWidth: '854px',
        }}
      >
        <AppHeader
          title={t('Your Liquidity')}
          subtitle={t('List of your liquidity positions')}
          IconSlot={
            <IconButton onClick={onPresentTransactionsModal} variant="text" scale="sm">
              <HistoryIcon color="textSubtle" width="24px" />
            </IconButton>
          }
          filter={
            <>
              <Flex as="label" htmlFor="hide-close-positions" alignItems="center">
                <Checkbox
                  id="hide-close-positions"
                  scale="sm"
                  name="confirmed"
                  type="checkbox"
                  checked={hideClosedPositions}
                  onChange={() => setHideClosedPositions((prev) => !prev)}
                />
                <Text ml="8px" color="textSubtle" fontSize="14px">
                  {t('Hide closed positions')}
                </Text>
              </Flex>

              <ButtonMenu
                scale="sm"
                activeIndex={selectedTypeIndex}
                onItemClick={(index) => setSelectedTypeIndex(index)}
                variant="subtle"
              >
                <ButtonMenuItem>{t('All')}</ButtonMenuItem>
                <ButtonMenuItem>V3</ButtonMenuItem>
                <ButtonMenuItem display={isStableSwapSupported(chainId) ? 'inline-flex' : 'none'}>
                  {t('StableSwap')}
                </ButtonMenuItem>
                <ButtonMenuItem>V2</ButtonMenuItem>
              </ButtonMenu>
            </>
          }
        />
        <Body>
          {mainSection}
          {selectedTypeIndex === FILTER.V2 ? <Liquidity.FindOtherLP /> : null}
          {showAllPositionButton && (
            <Flex alignItems="center" flexDirection="column">
              <Text color="textSubtle" mb="10px">
                {t("Don't see a pair you joined?")}
              </Text>
              <Button scale="sm" width="fit-content" variant="secondary" onClick={handleClickShowAllPositions}>
                {t('Show all positions')}
              </Button>
            </Flex>
          )}
        </Body>
        <CardFooter style={{ textAlign: 'center' }}>
          <NextLink href="/add" passHref>
            <Button id="join-pool-button" width="100%" startIcon={<AddIcon color="invertedContrast" />}>
              {t('Add Liquidity')}
            </Button>
          </NextLink>
        </CardFooter>
        <V3SubgraphHealthIndicator />
      </AppBody>
    </Page>
  )
}

PoolListPage.chains = CHAIN_IDS
