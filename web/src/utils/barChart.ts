import { ComputedBarDatum } from "@nivo/bar";
import { ScaleBand, ScaleLinear } from "d3-scale";

import { BarTimeDatum, Key, KeyInfoMap } from "@/types";
import { getPathFromKeyInfoMap } from "@/utils/router";

// Round values to a specified number of decimal places
export const roundToDecimalPlaces = (num: number, decimalPlaces: number) => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}

// Get key label from keyInfoMap
export const getKeyLabel = (id: string, keyInfoMap: KeyInfoMap) => keyInfoMap.get(id)?.label || id;

// Format string month to short month name
export const formatMonthAxisValue = (dateString: string) =>
  new Date(dateString).toLocaleString('default', { month: 'short' });

// Calculate the x position of the middle of the BAR
export const calculateMidBarXPosition = (scaleBand: ScaleBand<string>, bar: ComputedBarDatum<BarTimeDatum>) => {
  const xPosition = scaleBand(bar.data.indexValue.toString());
  return xPosition === undefined ? 0 : xPosition + scaleBand.bandwidth() / 2;
}

// Calculate the y position of the LINE
export const calculateYPosition = (scaleLinear: ScaleLinear<number, number>, value: number) =>
  scaleLinear(value);

// Extract max and min values
export const getMaxAndMinValues = (data: BarTimeDatum[]): { max: number; min: number } => {
  let max = -Infinity;
  let min = Infinity;

  data.forEach(datum => {
    const totals = Object.values(datum).reduce<{ totalPositive: number, totalNegative: number }>((acc, value) => {
      if (typeof value === "number") {
        if (value > 0) {
          acc.totalPositive += value;
        } else if (value < 0) {
          acc.totalNegative += value;
        }
      }
      return acc;
    }, { totalPositive: 0, totalNegative: 0 });

    max = Math.max(max, totals.totalPositive, totals.totalNegative);
    min = Math.min(min, totals.totalPositive, totals.totalNegative);
  });

  return { max, min };
};

// Get the value of the key from the entry
export const getValue = (data: BarTimeDatum[], time: string, key: Key): number | undefined =>
  data.find(d => d.time === time)?.[key] as number;

// Collect all unique keys from the data
export const getUniqueKeys = (data: BarTimeDatum[]): Set<Key> =>
  new Set(data.flatMap(Object.keys).filter(key => key !== "time"));

export const checkIsClickable = (keyInfoMap: KeyInfoMap, key: string, time?: string): boolean => {
  // TODO: Check if specific month is clickable
  return !!getPathFromKeyInfoMap(keyInfoMap, key);
}

// Get month number with leading zero, e.g. "2024-01" -> "01"
export const getMonthWithLeadingZero = (time: string): string => time.split('-')[1];
