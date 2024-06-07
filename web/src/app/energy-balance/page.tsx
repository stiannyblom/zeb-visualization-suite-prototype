import { Suspense } from 'react';
import { Metadata } from 'next';

import { BarTimeDatum, DataEntry, DataSourceContext, Key, KeyInfoContext, KeyInfoMap, Model, Resolution } from '@/types';
import { fetchEnergySummaryDataFromAPI } from '@/utils/api';
import { ChartHeader, DivergingStackedBar, ErrorAlert, LoadingContent } from '@/components/charts';

export const metadata: Metadata = {
  title: "Energy balance",
}

const grossEnergyDemandFetchContext: DataSourceContext = {
  measuredDataMeasurement: "new_point_B_building",
  modeledDataMeasurement: "new_point_B_building_model",
  negate: false,
  keyInfoMap: new Map([
    ["SH", { dataType: "measured", fields: ["SH"], carrier: "Electric", label: "Room heating" }],
    ["AHU", { dataType: "measured", fields: ["AHU"], carrier: "Electric", label: "Ventilation heating" }],
    ["HWH", { dataType: "measured", fields: ["HWH"], carrier: "Electric", label: "Hot water heating" }],
    ["Fans", { dataType: "measured", fields: ["Fans"], carrier: "Electric", label: "Fans" }],
    ["Aux", { dataType: "measured", fields: ["Aux"], carrier: "Electric", label: "Pumps (incl. auxiliary)" }],
    ["Lights", { dataType: "measured", fields: ["Lights"], carrier: "Electric", label: "Lights" }],
    ["Plugs", { dataType: "measured", fields: ["Plugs"], carrier: "Electric", label: "Plugs" }],
    ["ModeledUse", {
      dataType: "modeled",
      fields: ["SH", "AHU", "HWH", "Fans", "Aux", "Lights", "Plugs"],
      carrier: "Unknown",
      label: "Simulated use",
      color: "#ffffff",
      lineType: "full",
    }],
  ])
}

const deliveredEnergyFetchContext: DataSourceContext = {
  measuredDataMeasurement: "new_point_C_building",
  modeledDataMeasurement: "new_point_C_building_model",
  negate: false,
  keyInfoMap: new Map([
    ["DH", { dataType: "measured", fields: ["DH"], carrier: "Thermal", label: "District heating" }],
    ["ELSPECIFIC", { dataType: "measured", fields: ["ELSPECIFIC"], carrier: "Electric", label: "El.-specific consumption" }],
    ["HPU", { dataType: "measured", fields: ["HPU"], carrier: "Electric", label: "El. for heat pumps" }],
    ["HWH", { dataType: "measured", fields: ["HWH"], carrier: "Electric", label: "El. for direct electric heating (hot water)" }],
    ["CPU", { dataType: "measured", fields: ["CPU"], carrier: "Electric", label: "El. for cooling machines" }],
    ["ModeledUse", {
      dataType: "modeled",
      fields: ["ELSPECIFIC", "HWH", "HPU", "CPU", "DH"],
      carrier: "Unknown",
      label: "Simulated use",
      color: "#ffffff",
      lineType: "full",
    }],
  ])
}

const energyProducedFetchContext: DataSourceContext = {
  measuredDataMeasurement: "new_point_C_building",
  modeledDataMeasurement: "new_point_C_building_model",
  negate: true,
  keyInfoMap: new Map([
    ["PV", { dataType: "measured", fields: ["PV"], carrier: "Electric", label: "El. production (PV)", path: "/energy-in-out" }],
    ["ModeledProduction", {
      dataType: "modeled",
      fields: ["PV"],
      carrier: "Unknown",
      label: "Simulated production",
      color: "#ffffff",
      lineType: "dashed",
    }],
  ])
}

const upsertData = (data: BarTimeDatum[], time: string, key: string, value: number) => {
  const existing = data.find(d => d.time === time);
  if (existing) {
    existing[key] = value;
  } else {
    data.push({ time, [key]: value });
  }
};

const reduceFieldValues = (
  entry: DataEntry,
  fields: KeyInfoContext["fields"],
  carrier: KeyInfoContext["carrier"],
  dataType: KeyInfoContext["dataType"],
  model: Model
): number | null => {
  return fields.reduce<null | number>((acc, field) => {
    const fieldDataEntry = entry.fields[field];

    let value = null;
    if (dataType === 'measured') {
      value = fieldDataEntry[carrier].measured;
    } else if (dataType === 'modeled') {
      value = fieldDataEntry[carrier].modeled?.[model];
    }

    if (value !== null && value !== undefined) {
      return (acc ?? 0) + value;
    }

    return acc;
  }, null);
};

const fetchEnergyBalanceData = async ({ dataSourcesContext, year, model, resolution }: {
  dataSourcesContext: DataSourceContext[];
  year: string;
  model: Model;
  resolution: Resolution;
}) => {
  const combinedKeyInfoMap: KeyInfoMap = new Map();
  const sortMap: Map<Key, {
    dataType: KeyInfoContext['dataType'];
    negated?: boolean;
  }> = new Map();

  const measuredData: BarTimeDatum[] = [];
  const modeledData: BarTimeDatum[] = [];

  for (const ctx of dataSourcesContext) {
    // Extract unique fields
    const fields = Array.from(new Set([...ctx.keyInfoMap.values()].flatMap(keyInfo => keyInfo.fields)));

    // Fetch data from API
    const data = await fetchEnergySummaryDataFromAPI({
      measured_data_measurement: ctx.measuredDataMeasurement,
      modeled_data_measurement: ctx.modeledDataMeasurement,
      fields,
      models: [model],
      year,
      resolution,
      unit: "kilowattHours"
    });

    // Transform data to BarTimeDatum format
    data.data.forEach(entry => {
      for (const [key, keyInfo] of ctx.keyInfoMap) {
        const negated = ctx.negate ?? false;
        const value = reduceFieldValues(entry, keyInfo.fields, keyInfo.carrier, keyInfo.dataType, model);
        if (value === null) continue;
        const adjustedValue = negated ? -value : value;
        const data = keyInfo.dataType === 'modeled' ? modeledData : measuredData;
        upsertData(data, entry.time, key, adjustedValue);
        combinedKeyInfoMap.set(key, { label: keyInfo.label, color: keyInfo.color, path: keyInfo.path, lineType: keyInfo.lineType });
        sortMap.set(key, { dataType: keyInfo.dataType, negated });
      }
    });
  }

  // Sort keyInfoMap based on negation and dataType
  const sortedKeyInfoMap = new Map([...combinedKeyInfoMap.entries()].sort(([key1, info1], [key2, info2]) => {
    // Non-negated modeled data > non-negated measured data > negated measured data > negated modeled data
    if (sortMap.get(key1)?.negated === !sortMap.get(key2)?.negated) return -1;
    if (sortMap.get(key1)?.dataType === 'modeled' && sortMap.get(key1)?.negated) return -1;
    return 0
  }))

  // TODO: Add colors to all keyInfo objects

  // Add missing time entries to measuredData
  const measuredDataTimeSet = new Set(measuredData.map(entry => entry.time));
  modeledData.forEach(entry => {
    if (!measuredDataTimeSet.has(entry.time)) {
      measuredData.push({ time: entry.time });
    }
  });

  return { barData: measuredData, lineData: modeledData, keyInfoMap: sortedKeyInfoMap };
};

export default async function EnergyBalancePage({ searchParams }: {
  searchParams?: {
    year?: string,
    measuringPoint?: string,
    model?: string,
  }
}) {
  const { year, measuringPoint, model } = searchParams || {};

  const chartHeaderText = year ? `Energy balance for ${year}` : 'Energy balance'

  if (!year || !measuringPoint || !model) {
    return (
      <div className='flex flex-col items-center'>
        <ChartHeader text={chartHeaderText} />
        <LoadingContent />
      </div>
    );
  }

  const energyUseFetchContext = measuringPoint === "demand-gross" ? grossEnergyDemandFetchContext : deliveredEnergyFetchContext;
  const dataSourcesContext = [energyUseFetchContext, energyProducedFetchContext];

  try {
    const { barData, lineData, keyInfoMap } = await fetchEnergyBalanceData({
      dataSourcesContext,
      year,
      model,
      resolution: "monthly"
    });

    return (
      <div className='flex flex-col items-center'>
        <ChartHeader text={chartHeaderText} />
        <div className=''>
          {(!barData || !lineData || barData.length === 0 && lineData.length === 0) &&
            <ErrorAlert message="No data for this year. Please select a different year." />}
          {(barData.length > 0 || lineData.length > 0) &&
            <Suspense>
              <DivergingStackedBar barData={barData} lineData={lineData} keyInfoMap={keyInfoMap} />
            </Suspense>
          }
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return (
      <div className='flex flex-col'>
        <ChartHeader text={chartHeaderText} />
        <ErrorAlert message="Error fetching data. Please try a different year." />
      </div>
    );
  }
}
