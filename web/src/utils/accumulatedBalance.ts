import { DataType, FetchDataContext, Key, LinesContext, LineSerie, LineSerieDatum, TimeSeriesSingleValueDataType } from "@/types";
import { fetchEnergyTimeSeriesDataFromAPI } from "@/utils/api";
import { InvalidOptionError } from "@/utils/options";

export const fetchDataForPeriod = async (dataContext: FetchDataContext, year: string, month: string, model?: string, convertToCO2?: boolean) => {
  const data = await fetchEnergyTimeSeriesDataFromAPI({
    dataContext,
    year,
    models: model ? [model] : undefined,
    resolution: "monthly",
    convertToCO2
  });

  if (month === "all") {
    const results = data.getData();

    if (!results.size) {
      throw new InvalidOptionError("No data for this year. Please select a different year.");
    }

    return results;
  }

  // Specific month selected
  throw new InvalidOptionError("Data is only available for the full year.");
};

export const createLinesFromData = (lineContext: LinesContext, data: TimeSeriesSingleValueDataType) => {
  const measuredLineSerie: LineSerie = {
    ...lineContext.measured,
    dataType: "measured",
    data: []
  };

  const modeledLineSerie: LineSerie = {
    ...lineContext.modeled,
    dataType: "modeled",
    data: []
  };

  const dataTypes: DataType[] = ["measured", "modeled"]

  for (const dataType of dataTypes) {
    const line = dataType === "measured" ? measuredLineSerie : modeledLineSerie;

    for (const [time, keyValueMap] of data.entries()) {

      // Get positive contribution
      const keyPositive = lineContext[dataType].valueFromDatum.positiveContribution;
      const valuePositive = keyValueMap.get(keyPositive)?.[dataType];

      // Get negative contribution
      const keyNegative = lineContext[dataType].valueFromDatum.negativeContribution;
      const valueNegative = keyValueMap.get(keyNegative)?.[dataType];

      // Add data
      let datum: LineSerieDatum | null = null;
      if (valuePositive != null) {
        datum = datum ?? { x: time, y: { positiveContribution: null, negativeContribution: null } };
        datum.y.positiveContribution = valuePositive;
      }
      if (valueNegative != null) {
        datum = datum ?? { x: time, y: { positiveContribution: null, negativeContribution: null } };
        datum.y.negativeContribution = valueNegative;
      }
      if (datum) {
        line.data.push(datum);
      }
    }
  }

  return { measuredLineSerie, modeledLineSerie };
}
