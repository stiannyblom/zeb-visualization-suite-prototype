import { DataType, FetchDataContext, Key, Model, OptionValues, SankeyContext, SankeyLink, SankeyNode, SingleValueDatum, TimeSeriesDataType, TimeSeriesSingleValueDataType } from "@/types";
import { InvalidOptionError } from "@/utils/options";
import { fetchEnergyTimeSeriesDataFromAPI } from "@/utils/api";

export const filterOutNotMeasuredData = (data: TimeSeriesDataType) => {
  const filteredData: TimeSeriesDataType = new Map();
  for (const [period, keyDatumMap] of data) {
    if (Array.from(keyDatumMap.values()).map(datum => datum.measured).some(value => value !== null)) {
      filteredData.set(period, keyDatumMap);
    }
  }
  return filteredData;
}

const addValueIfExists = (
  existingValue: number | null,
  newValue: number | null
): number | null => {
  if (newValue === null) return existingValue;
  if (existingValue === null) return newValue;
  return existingValue + newValue;
};

export const sumData = (
  data: TimeSeriesSingleValueDataType,
): Map<Key, SingleValueDatum> => {
  const summedData: Map<Key, SingleValueDatum> = new Map();

  for (const keyDatumMap of data.values()) {
    for (const [key, datum] of keyDatumMap.entries()) {
      const summedDatum = summedData.get(key) ?? { measured: null, modeled: null };

      summedDatum.measured = addValueIfExists(summedDatum.measured, datum.measured);
      summedDatum.modeled = addValueIfExists(summedDatum.modeled, datum.modeled);

      summedData.set(key, summedDatum);
    }
  }

  return summedData;
};

const isLinkWithSmallValue = ({ sourceValue, targetValue, value, skipPercentageThreshold }: {
  sourceValue: number | null | undefined,
  targetValue: number | null | undefined,
  value: number,
  skipPercentageThreshold: number,
}) => {
  // Skip links with small values as percentage of source or target value
  if (sourceValue === undefined || sourceValue === null || sourceValue === 0) {
    return true;
  }

  const sourcePercentage = value / Math.abs(sourceValue);
  if (sourcePercentage < skipPercentageThreshold) {
    // console.log("Skipping link with small value compared to source value:", key, value, sourceValue, sourcePercentage)
    return true;
  } else if (sourcePercentage === 1) {
    if (targetValue === undefined || targetValue === null || targetValue === 0) {
      // console.log("Target value is undefined, null or zero:", key, linkInfo.target)
      return true;
    } else {
      const targetPercentage = value / Math.abs(targetValue);
      if (targetPercentage < skipPercentageThreshold) {
        // console.log("Skipping link with small value compared to target value:", key, value, targetValue, targetPercentage)
        return true;
      }
    }
  }

  return false;
}

const processValue = (value: number | undefined | null) => {
  if (value == null) return { value: null, reverse: false };
  if (value < 0) return { value: -value, reverse: true };
  return { value, reverse: false };
};

const shouldSkipLink = (
  sourceValue: number | null | undefined,
  targetValue: number | null | undefined,
  value: number,
  hideIfSmall: boolean,
  skipPercentageThreshold: number,
  showIfOptionValues: OptionValues | undefined,
  options: OptionValues,
) => {
  let shouldSkip = false;

  if (showIfOptionValues) {
    shouldSkip = Object.entries(showIfOptionValues).some(([key, value]) => options[key] !== value);
  }

  if (hideIfSmall) {
    shouldSkip = isLinkWithSmallValue({
      sourceValue,
      targetValue,
      value,
      skipPercentageThreshold,
    })
    if (shouldSkip) return true;
  }

  return shouldSkip;
};

const getNodeLabel = (key: Key, nodesContext: SankeyContext["nodes"]) => {
  return nodesContext.get(key)?.label ?? key;
}

const createLinkObject = (
  source: string,
  target: string,
  value: number,
  nodes: SankeyContext["nodes"]
) => ({
  source: getNodeLabel(source, nodes),
  target: getNodeLabel(target, nodes),
  value,
});

export const createLinksFromData = (
  sankeyContext: SankeyContext,
  data: Map<string, SingleValueDatum>,
  skipPercentageThreshold: number,
  options: OptionValues,
): { links: SankeyLink[]; modeledDataLinks: SankeyLink[] } => {
  const links: SankeyLink[] = [];
  const modeledDataLinks: SankeyLink[] = [];

  for (const linkInfo of sankeyContext.links.values()) {
    let { source, target, hideIfSmall, showIfOptionValues } = linkInfo;

    const handleLinkData = (dataType: DataType, linkArray: SankeyLink[]) => {
      const { value, reverse } = processValue(data.get(linkInfo.valueFromDatum)?.[dataType]);
      if (value == null) return;
      if (reverse) [source, target] = [target, source];

      const sourceValue = data.get(source)?.[dataType];
      const targetValue = data.get(target)?.[dataType];

      if (shouldSkipLink(sourceValue, targetValue, value, !!hideIfSmall, skipPercentageThreshold, showIfOptionValues, options)) {
        return;
      }

      linkArray.push(createLinkObject(source, target, value, sankeyContext.nodes));
    };

    handleLinkData('measured', links);
    handleLinkData('modeled', modeledDataLinks);
  }

  return { links, modeledDataLinks };
};

export const createNodesFromLinks = (sankeyContext: SankeyContext, links: SankeyLink[]): SankeyNode[] => {
  const nodes: SankeyNode[] = [];

  // Create nodes
  for (const [key, nodeInfo] of sankeyContext.nodes.entries()) {
    const nodeLabel = nodeInfo.label ?? key;
    const hasConnectedLinks = links.some((link) => link.source === nodeLabel || link.target === nodeLabel);

    // Ignore nodes with no connected links
    if (hasConnectedLinks) {
      nodes.push({
        id: nodeLabel,
        color: nodeInfo.color ?? "hsl(205, 70%, 50%)",
        onClickInfo: nodeInfo.onClickInfo,
      });
    }
  }

  return nodes
}

export const fetchDataForPeriod = async (dataContext: FetchDataContext, year: string, month: string, model?: string) => {
  const data = await fetchEnergyTimeSeriesDataFromAPI({
    dataContext,
    year,
    models: model ? [model] : undefined,
    resolution: "monthly",
  });

  if (month === "all") {
    const results = data.getData();

    if (!results.size) {
      throw new InvalidOptionError("No data for this year. Please select a different year.");
    }

    return results;
  }

  // Specific month selected
  const periodKey = `${year}-${month}`;
  const monthData = data.getData().get(periodKey);

  if (!monthData) {
    throw new InvalidOptionError("No data for this period. Please select a different period.");
  }

  return new Map([[periodKey, monthData]]);
};

