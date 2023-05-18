import { GetStaticProps, InferGetStaticPropsType, NextPage } from 'next'
import { Text, Flex, Box, Button } from 'components/primitives'
import Layout from 'components/Layout'
import Image from 'next/image'
import { ComponentPropsWithoutRef, useContext, useState } from 'react'
import { Footer } from 'components/home/Footer'
import { useMediaQuery } from 'react-responsive'
import { useMarketplaceChain, useMounted } from 'hooks'
import { useAccount } from 'wagmi'
import { paths } from '@reservoir0x/reservoir-sdk'
import { useCollections } from '@reservoir0x/reservoir-kit-ui'
import fetcher from 'utils/fetcher'
import { NORMALIZE_ROYALTIES } from './_app'
import supportedChains from 'utils/chains'
import Link from 'next/link'
import ChainToggle from 'components/common/ChainToggle'
import CollectionsTimeDropdown, {
  CollectionsSortingOption,
} from 'components/common/CollectionsTimeDropdown'
import { Head } from 'components/Head'
import { CollectionRankingsTable } from 'components/rankings/CollectionRankingsTable'
import { ChainContext } from 'context/ChainContextProvider'

type Props = InferGetStaticPropsType<typeof getStaticProps>

const IndexPage: NextPage<Props> = ({ ssr }) => {
  const isSSR = typeof window === 'undefined'
  const isMounted = useMounted()
  const compactToggleNames = useMediaQuery({ query: '(max-width: 800px)' })
  const [sortByTime, setSortByTime] =
    useState<CollectionsSortingOption>('1DayVolume')
  const marketplaceChain = useMarketplaceChain()
  const { isDisconnected } = useAccount()

  let collectionQuery: Parameters<typeof useCollections>['0'] = {
    limit: 10,
    sortBy: sortByTime,
    includeTopBid: true,
  }

  const { chain } = useContext(ChainContext)

  if (chain.collectionSetId) {
    collectionQuery.collectionsSetId = chain.collectionSetId
  } else if (chain.community) {
    collectionQuery.community = chain.community
  }

  const { data, isValidating } = useCollections(collectionQuery, {
    fallbackData: [ssr.collections[marketplaceChain.id]],
  })

  let collections = data || []

  let volumeKey: ComponentPropsWithoutRef<
    typeof CollectionRankingsTable
  >['volumeKey'] = 'allTime'

  switch (sortByTime) {
    case '1DayVolume':
      volumeKey = '1day'
      break
    case '7DayVolume':
      volumeKey = '7day'
      break
    case '30DayVolume':
      volumeKey = '30day'
      break
  }

  return (
    <Layout>
      <Head />
      <Box
        css={{
          p: 24,
          height: '100%',
          '@bp800': {
            p: '$6',
          },
        }}
      >
        {isDisconnected && (
          <Flex
            direction="column"
            align="center"
            css={{ mx: 'auto', maxWidth: 728, pt: '$5', textAlign: 'center' }}
          >
            <Text style="h3" css={{ mb: 24 }}>
              Aura Exchange
            </Text>
            <Text style="body1" css={{ mb: 48 }}>
              Aura Exchange Marketplace is the NFT Marketplace
              that adds utility to your project.
            </Text>
          </Flex>
        )}
        <Flex
          css={{
            height: '100%',
            textAlign: 'center',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridGap: '$3',
            alignItems: 'center',
            '@media screen and (max-width: 768px)': { // hide on screens smaller than 768px
              display: 'none',
            },
          }}
        >
          <Text style="h1" as="h1">
            Wolf Punx
          </Text>
          <Link href="/portfolio">
            <Box css={{ width: 750, cursor: 'pointer' }}>
              <Image
                src="/WolfPunksLogo.png"
                width={750}
                height={571}
                alt="Listing"
              />
            </Box>
          </Link>
        </Flex>
        <Footer />
      </Box>
    </Layout>
  )
}

type CollectionSchema =
  paths['/collections/v5']['get']['responses']['200']['schema']
type ChainCollections = Record<string, CollectionSchema>

export const getStaticProps: GetStaticProps<{
  ssr: {
    collections: ChainCollections
  }
}> = async () => {
  let collectionQuery: paths['/collections/v5']['get']['parameters']['query'] =
  {
    sortBy: '1DayVolume',
    normalizeRoyalties: NORMALIZE_ROYALTIES,
    includeTopBid: true,
    limit: 10,
  }

  const promises: ReturnType<typeof fetcher>[] = []
  supportedChains.forEach((chain) => {
    const query = { ...collectionQuery }
    if (chain.collectionSetId) {
      query.collectionsSetId = chain.collectionSetId
    } else if (chain.community) {
      query.community = chain.community
    }
    promises.push(
      fetcher(`${chain.reservoirBaseUrl}/collections/v5`, query, {
        headers: {
          'x-api-key': chain.apiKey || '',
        },
      })
    )
  })
  const responses = await Promise.allSettled(promises)
  const collections: ChainCollections = {}
  responses.forEach((response, i) => {
    if (response.status === 'fulfilled') {
      collections[supportedChains[i].id] = response.value.data
    }
  })

  return {
    props: { ssr: { collections } },
    revalidate: 5,
  }
}

export default IndexPage
