import { Key, Model, SingleValueDatum, TimeSeriesDataType, TimeSeriesSingleValueDataType } from "@/types";

export const filterOutNonSpecifiedModelData = (
  data: TimeSeriesDataType,
  model?: Model
) => {
  const newData: TimeSeriesSingleValueDataType = new Map();

  for (const [time, keyDatumMap] of data.entries()) {
    const filteredData: Map<Key, SingleValueDatum> = new Map();

    for (const [key, datum] of keyDatumMap.entries()) {
      const newDatum: SingleValueDatum = {
        measured: datum.measured,
        modeled: !model ? null : datum.modeled?.[model] ?? null,
      };

      filteredData.set(key, newDatum);
    }
    newData.set(time, filteredData);
  }

  return newData;
};

// Round values to a specified number of decimal places
export const roundToDecimalPlaces = (num: number, decimalPlaces: number) => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}
