"use client"

import { Theme } from '@nivo/core';
import { Sankey as NivoSankey, SankeyLinkDatum, SankeyNodeDatum } from '@nivo/sankey'

import { SankeyData, SankeyLink, SankeyNode } from '@/types'
import { roundToDecimalPlaces } from '@/utils/barChart'
import { NUMBERS_LOCALE } from '@/config/locale';
import { useNavbar } from '@/context/NavbarContext';
import { useNav } from '@/hooks/useNav';
import { useOptions } from '@/context/OptionsContext';
import { cn } from '@/utils/design';
import { TOOLTIP_BACKGROUND_COLOR } from '@/config/color';

const CustomTooltipContainer = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-3 text-lg", className)} style={{ backgroundColor: TOOLTIP_BACKGROUND_COLOR }}>
    {children}
  </div>
)

const NodeTooltip = ({ node, modeledDataLinks }: { node: SankeyNodeDatum<SankeyNode, SankeyLink>, modeledDataLinks?: SankeyLink[] }) => {
  const { sourceLinks, targetLinks } = node

  // Calculate the total incoming and outgoing values
  const incomingMeasured = targetLinks.reduce((acc, link) => acc + link.value, 0)
  const outgoingMeasured = sourceLinks.reduce((acc, link) => acc + link.value, 0)

  // Calculate the total incoming and outgoing modeled values
  const incomingModeled = modeledDataLinks?.filter(l => l.target === node.id).reduce((acc, link) => acc + link.value, 0)
  const outgoingModeled = modeledDataLinks?.filter(l => l.source === node.id).reduce((acc, link) => acc + link.value, 0)

  return (
    <CustomTooltipContainer className="space-y-3">
      <strong style={{ color: node.color }}>{node.label}</strong>
      {targetLinks.length > 0 && (
        <div className='flex flex-col'>
          <strong>Incoming:</strong>
          {incomingMeasured !== undefined && (
            <strong className='text-base'>Measured: {formatValue(incomingMeasured, NUMBERS_LOCALE)}</strong>
          )}
          {incomingModeled !== undefined && (
            <strong className='text-sm'>Simulated: {formatValue(incomingModeled, NUMBERS_LOCALE)}</strong>
          )}
        </div>
      )}
      {sourceLinks.length > 0 && (
        <div className='flex flex-col'>
          <strong>Outgoing:</strong>
          {outgoingMeasured !== undefined && (
            <strong className='text-base'>Measured: {formatValue(outgoingMeasured, NUMBERS_LOCALE)}</strong>
          )}
          {outgoingModeled !== undefined && (
            <strong className='text-sm'>Simulated: {formatValue(outgoingModeled, NUMBERS_LOCALE)}</strong>
          )}
        </div>
      )}
    </CustomTooltipContainer>
  )
}

const LinkTooltip = ({ link, modeledDataLinks }: { link: SankeyLinkDatum<SankeyNode, SankeyLink>, modeledDataLinks?: SankeyLink[] }) => {
  const { source, target, value: measuredValue } = link

  // Get the color of the nodes
  const sourceColor = source.color
  const targetColor = target.color

  // Get the modeled value for the link
  const modeledLink = modeledDataLinks?.find(l => l.source === source.id && l.target === target.id)
  const modeledValue = modeledLink?.value

  return (
    <CustomTooltipContainer className='space-y-3'>
      <strong style={{ color: sourceColor }}>{source.label}</strong> ⟶ <strong style={{ color: targetColor }}>{target.label}</strong>
      <div className='flex flex-col'>
        <strong>Measured: {formatValue(measuredValue, NUMBERS_LOCALE)}</strong>
        {modeledValue !== undefined && (
          <strong className='text-base'>Simulated: {formatValue(modeledValue, NUMBERS_LOCALE)}</strong>
        )}
      </div>
    </CustomTooltipContainer>
  )
}

const formatValue = (v: number, locale: Intl.LocalesArgument) => `${roundToDecimalPlaces(v, 0).toLocaleString(locale)} kWh`

const getOnClickInfo = ({ datum, nodesCtx, linksCtx }: {
  nodesCtx: SankeyNode[]
  linksCtx: SankeyLink[]
  datum: SankeyNodeDatum<SankeyNode, SankeyLink> | SankeyLinkDatum<SankeyNode, SankeyLink>
}) => {
  let sankeyElementCtx: SankeyNode | SankeyLink | undefined = undefined;

  if (datum.hasOwnProperty('sourceLinks') || datum.hasOwnProperty('targetLinks')) {
    const nodeDatum = datum as SankeyNodeDatum<SankeyNode, SankeyLink>
    sankeyElementCtx = nodesCtx.find(n => n.id === nodeDatum.id)
  } else if (datum.hasOwnProperty('source') && datum.hasOwnProperty('target')) {
    const linkDatum = datum as SankeyLinkDatum<SankeyNode, SankeyLink>
    sankeyElementCtx = linksCtx.find(l => l.source === linkDatum.source.id && l.target === linkDatum.target.id)
  }

  if (sankeyElementCtx && sankeyElementCtx.onClickInfo) {
    return sankeyElementCtx.onClickInfo
  }
}

interface SankeyProps {
  pageId: string;
  nodes: SankeyData["nodes"];
  links: SankeyData["links"];
  modeledDataLinks: SankeyData["modeledDataLinks"];
}

export const Sankey = ({ pageId, nodes, links, modeledDataLinks }: SankeyProps) => {
  const { isOpen: sidebarIsOpen } = useNavbar();
  const { navigateToPage } = useNav()
  const { pageSpecificOptionValues, changePageSpecificOptionValue } = useOptions()

  const onClick = ({ datum }: {
    datum: SankeyNodeDatum<SankeyNode, SankeyLink> | SankeyLinkDatum<SankeyNode, SankeyLink>
  }) => {
    const onClickInfo = getOnClickInfo({ datum, nodesCtx: nodes, linksCtx: links })

    if (onClickInfo) {
      if (onClickInfo.actionType === 'navigateToPage') {
        // Navigate to the specified page
        const newPageId = onClickInfo.pageId
        navigateToPage({ pageId: newPageId })
      } else if (onClickInfo.actionType === 'toggleOptionValue') {
        const optionKey = onClickInfo.optionKey

        const previousValue = pageSpecificOptionValues[pageId][optionKey]
        if (typeof previousValue !== "boolean") {
          console.error("Option value is not a boolean. Cannot toggle.")
          return
        }

        const newValue = !previousValue
        changePageSpecificOptionValue(pageId, optionKey, newValue)
      }
    }
  }

  const THEME: Theme = {
    text: { fontSize: 16 },
  }

  return (
    <NivoSankey
      data={{ nodes, links }}
      width={sidebarIsOpen ? 1400 : 1600}
      height={700}
      margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
      align="justify"
      colors={{ scheme: 'category10' }}
      theme={THEME}
      animate={true}
      motionConfig="stiff"
      nodeOpacity={1}
      nodeHoverOthersOpacity={0.35}
      nodeThickness={18}
      nodeSpacing={24}
      nodeBorderWidth={0}
      nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
      nodeBorderRadius={3}
      linkOpacity={0.5}
      linkHoverOthersOpacity={0.1}
      linkContract={3}
      enableLinkGradient={true}
      labelPosition="inside"
      labelPadding={16}
      labelOrientation="horizontal"
      labelTextColor="#ffffff"
      valueFormat={v => formatValue(v, NUMBERS_LOCALE)}
      nodeTooltip={({ node }) => <NodeTooltip node={node} modeledDataLinks={modeledDataLinks} />}
      linkTooltip={({ link }) => <LinkTooltip link={link} modeledDataLinks={modeledDataLinks} />}
      onClick={(data) => onClick({ datum: data })}
    />
  )
}
