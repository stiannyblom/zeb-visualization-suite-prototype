"use client"

import { useState } from "react";
import { Theme } from "@nivo/core";
import { Bar, BarLayer, ComputedDatum } from "@nivo/bar";
import { Datum } from "@nivo/legends";

import { BarTimeDatum, Key, KeyInfoMap, SVGElementCustomClickEvent } from "@/types";
import { getKeyLabel, formatMonthAxisValue, getMaxAndMinValues, roundToDecimalPlaces, checkIsClickable, getMonthWithLeadingZero } from "@/utils/barChart";
import { getPathFromKeyInfoMap } from "@/utils/router";
import { useCustomLineLayers } from "@/hooks/useCustomLineLayers";
import { useColors } from "@/hooks/useColors";
import { useNav } from "@/hooks/useNav";
import { NUMBERS_LOCALE } from "@/config/locale";
import { useNavbar } from "@/context/NavbarContext";
import { TOOLTIP_BACKGROUND_COLOR } from "@/config/color";

interface DivergingStackedBarProps {
  barData: BarTimeDatum[];
  lineData: BarTimeDatum[];
  keyInfoMap: KeyInfoMap;
}

export const DivergingStackedBar = ({ barData, lineData, keyInfoMap }: DivergingStackedBarProps) => {
  const { pathname, navigate } = useNav();
  const { isOpen: sidebarIsOpen } = useNavbar();

  const keys = Array.from(keyInfoMap.keys());
  const [focusedKey, setFocusedKey] = useState<Key | null>(null);
  const colors = useColors(keyInfoMap, focusedKey);

  // Get max and min values for the chart height
  const { max: maxValue, min: minValue } = getMaxAndMinValues([...barData, ...lineData]);

  const onLegendClick = (datum: Datum) => {
    const { id } = datum;
    const targetPath = getPathFromKeyInfoMap(keyInfoMap, id.toString());

    if (targetPath) {
      navigate({
        basepath: pathname,
        pathname: targetPath,
        optionValueChanges: { month: "all" },
      });
    }
  }

  const onBarSegmentClicked = (datum: ComputedDatum<BarTimeDatum> & {
    color: string;
  }) => {
    const key = datum.id.toString();
    const targetPath = getPathFromKeyInfoMap(keyInfoMap, key);

    if (targetPath) {
      const time = datum.indexValue.toString(); // Returns e.g. "2024-01"
      const monthWithLeadingZero = time.split('-')[1];

      navigate({
        basepath: pathname,
        pathname: targetPath,
        optionValueChanges: { month: monthWithLeadingZero },
      });
    }
  }

  const onSimulatedDataPointClick: SVGElementCustomClickEvent = (_, key, time) => {
    const targetPath = getPathFromKeyInfoMap(keyInfoMap, key);

    if (targetPath) { // TODO: Check if specific month is clickable
      const monthWithLeadingZero = time.split('-')[1];

      navigate({
        basepath: pathname,
        pathname: targetPath,
        optionValueChanges: { month: monthWithLeadingZero },
      });
    }
  }

  // Generate custom line layers
  const customLineLayers = useCustomLineLayers(lineData, keyInfoMap, colors, onSimulatedDataPointClick);
  const layers: BarLayer<BarTimeDatum>[] = ['grid', 'axes', 'bars', 'markers', 'legends', 'annotations'];
  if (customLineLayers.length > 0) {
    const barsIndex = layers.indexOf('bars');
    if (barsIndex !== -1) {
      layers.splice(barsIndex + 1, 0, ...(customLineLayers));
    }
  }

  if (barData.length === 0 && lineData.length === 0) {
    return <></>;
  }

  const KEY_LEGEND_OFFSET = 300;

  const THEME: Theme = {
    text: { fill: '#BBBABD', fontSize: 12, fontWeight: 700 }
  };

  return (
    <Bar
      data={barData}
      keys={keys}
      indexBy="time"
      width={sidebarIsOpen ? 1500 : 1700}
      height={700}
      margin={{ top: 40, right: KEY_LEGEND_OFFSET, bottom: 40, left: 240 }}
      padding={0.1}
      minValue={minValue}
      maxValue={maxValue}
      colors={({ id }) => colors.get(id.toString()) ?? '#BBBABD'}
      theme={THEME}
      tooltip={({ id, value, color }) => (
        <div className="p-3" style={{ color, backgroundColor: TOOLTIP_BACKGROUND_COLOR }}>
          <strong>{getKeyLabel(id.toString(), keyInfoMap)}: {roundToDecimalPlaces(value, 0).toLocaleString(NUMBERS_LOCALE)} kWh</strong>
        </div>
      )}
      axisBottom={{
        format: formatMonthAxisValue,
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legendPosition: 'middle',
        legendOffset: 40,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        format: v => `${v.toLocaleString(NUMBERS_LOCALE)} kWh`,
      }}
      enableLabel={false}
      labelSkipWidth={12}
      labelSkipHeight={15}
      labelTextColor="#222222"
      legends={[{
        dataFrom: 'keys',
        anchor: 'right',
        direction: 'column',
        translateX: KEY_LEGEND_OFFSET,
        itemWidth: KEY_LEGEND_OFFSET - 10,
        itemHeight: 20,
        itemOpacity: 0.85,
        symbolSize: 20,
        effects: [{ on: 'hover', style: { itemOpacity: 1, symbolSize: 25 } }],
        onMouseEnter: (datum, event) => {
          const key = datum.id.toString() as Key
          setFocusedKey(key)

          if (checkIsClickable(keyInfoMap, key)) {
            event.currentTarget.style.cursor = "pointer"
          } else {
            event.currentTarget.style.cursor = "default"
          };
        },
        onMouseLeave: () => setFocusedKey(null),
        onClick: onLegendClick,
      }]}
      legendLabel={d => getKeyLabel(d.id.toString(), keyInfoMap)}
      valueFormat={v => `${roundToDecimalPlaces(v, 0)}`}
      layers={layers}
      valueScale={{ type: 'linear', nice: true }}
      onMouseEnter={(datum, event) => {
        const key = datum.id.toString();
        const month = getMonthWithLeadingZero(datum.indexValue.toString());

        if (checkIsClickable(keyInfoMap, key, month)) event.currentTarget.style.cursor = "pointer";
      }}
      onClick={onBarSegmentClicked}
      markers={[{
        axis: 'y',
        value: 0,
        lineStyle: { stroke: 'rgba(256, 256, 256, 0.5)', strokeWidth: 2 },
      }]}
    />
  )
};
