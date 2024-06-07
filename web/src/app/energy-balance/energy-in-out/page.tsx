import { Metadata } from 'next';

import { FetchDataContext, Model, OptionValues, SankeyContext, TimeSeriesDataType, ToggleOptionValueActionInfo } from '@/types';
import { ChartHeader, ErrorAlert, LoadingContent, Sankey } from '@/components/charts';
import { OPTIONS_SITEWIDE } from '@/config/options';
import { createLinksFromData, createNodesFromLinks, fetchDataForPeriod, filterOutNotMeasuredData, sumData } from '@/utils/energyInAndOut';
import { InvalidOptionError, OptionsNotSetError, validateSitewideOptions } from '@/utils/options';
import { filterOutNonSpecifiedModelData } from '@/utils/data';


export const metadata: Metadata = {
  title: "Energy in and out",
}

const fetchDataContext: FetchDataContext = {
  direct: {
    measured: new Map([
      ["new_point_C_building", new Map([
        ["PV", { carrier: "Electric", field: "PV" }],
        ["EXPORT", { carrier: "Electric", field: "EXPORT" }],
        ["OWNCONSUME", { carrier: "Electric", field: "OWNCONSUME" }],
        ["IMPORT", { carrier: "Electric", field: "IMPORT" }],
        ["ELSPECIFIC", { carrier: "Electric", field: "ELSPECIFIC" }],
        ["HPU", { carrier: "Electric", field: "HPU" }],
        ["HWH", { carrier: "Electric", field: "HWH" }],
        ["CPU", { carrier: "Electric", field: "CPU" }],
        // ["DH", { carrier: "Thermal", field: "DH" }],
      ])]
    ]),
    modeled: new Map([
      ["new_point_C_building_model", new Map([
        ["PV", { carrier: "Unknown", field: "PV" }],
        ["EXPORT", { carrier: "Unknown", field: "EXPORT" }],
        ["OWNCONSUME", { carrier: "Unknown", field: "OWNCONSUME" }],
        ["IMPORT", { carrier: "Unknown", field: "IMPORT" }],
        ["ELSPECIFIC", { carrier: "Unknown", field: "ELSPECIFIC" }],
        ["HPU", { carrier: "Unknown", field: "HPU" }],
        ["HWH", { carrier: "Unknown", field: "HWH" }],
        ["CPU", { carrier: "Unknown", field: "CPU" }],
        // ["DH", { carrier: "Unknown", field: "DH" }],
      ])]
    ])
  },
  calculated: new Map([
    ["PV_FACADE_MOCKVALUE", { calcExpression: "PV / 6", convertNullsToZero: true }],
    ["TOTALCONSUMPTION", { calcExpression: "ELSPECIFIC + HPU + HWH + CPU", convertNullsToZero: true }],
    ["PV_UNASSIGNED", { calcExpression: "PV - (EXPORT + OWNCONSUME)", convertNullsToZero: true }],
    ["CONSUMPTION_UNASSIGNED", { calcExpression: "TOTALCONSUMPTION - (OWNCONSUME + IMPORT)", convertNullsToZero: true }],
  ]),
}

// Measuring point: delivered energy
const togglePVFacades: ToggleOptionValueActionInfo = {
  actionType: "toggleOptionValue",
  optionKey: "showElProductionDetails",
}
const deliveredEnergySankeyContext: SankeyContext = {
  nodes: new Map([
    ["PV_FACADE_ROOF", { label: "Roof (Mock value)" }],
    ["PV_FACADE_NORTH", { label: "North façade (Mock value)", }],
    ["PV_FACADE_SOUTH", { label: "South façade (Mock value)" }],
    ["PV_FACADE_WEST", { label: "West façade (Mock value)" }],
    ["PV_FACADE_EAST", { label: "East façade (Mock value)" }],
    ["PV_FACADE_PERGOLA", { label: "Pergola (Mock value)" }],
    ["PV", { label: "El. production (PV)", onClickInfo: togglePVFacades }],
    ["PV_UNASSIGNED", { label: "Unassigned el. production" }],
    ["EXPORT", { label: "Export to el. grid" }],
    ["OWNCONSUME", { label: "El. self-consumption" }],
    ["IMPORT", { label: "Import from el. grid" }],
    ["CONSUMPTION_UNASSIGNED", { label: "Unassigned input" }],
    ["TOTALCONSUMPTION", { label: "Total el. consumption" }],
    ["ELSPECIFIC", { label: "El.-specific consumption" }],
    ["HPU", { label: "El. for heat pumps" }],
    ["HWH", { label: "El. for direct electric heating (hot water)" }],
    ["CPU", { label: "El. for cooling machines" }],
    // ["DH", { label: "District heating" }],
  ]),
  links: new Map([
    // TODO: Façade links mocked for now, add actual data to facade links when available
    ["FACADE_ROOF_MOCKVALUE", { source: "PV_FACADE_ROOF", target: "PV", valueFromDatum: "PV_FACADE_MOCKVALUE", showIfOptionValues: { "showElProductionDetails": "true" } }],
    ["FACADE_NORTH_MOCKVALUE_PV", { source: "PV_FACADE_NORTH", target: "PV", valueFromDatum: "PV_FACADE_MOCKVALUE", showIfOptionValues: { "showElProductionDetails": "true" } }],
    ["FACADE_SOUTH_MOCKVALUE_PV", { source: "PV_FACADE_SOUTH", target: "PV", valueFromDatum: "PV_FACADE_MOCKVALUE", showIfOptionValues: { "showElProductionDetails": "true" } }],
    ["FACADE_WEST_MOCKVALUE_PV", { source: "PV_FACADE_WEST", target: "PV", valueFromDatum: "PV_FACADE_MOCKVALUE", showIfOptionValues: { "showElProductionDetails": "true" } }],
    ["FACADE_EAST_MOCKVALUE_PV", { source: "PV_FACADE_EAST", target: "PV", valueFromDatum: "PV_FACADE_MOCKVALUE", showIfOptionValues: { "showElProductionDetails": "true" } }],
    ["FACADE_PERGOLA_MOCKVALUE", { source: "PV_FACADE_PERGOLA", target: "PV", valueFromDatum: "PV_FACADE_MOCKVALUE", showIfOptionValues: { "showElProductionDetails": "true" } }],
    ["PV_EXPORT", { source: "PV", target: "EXPORT", valueFromDatum: "EXPORT" }],
    ["PV_OWNCONSUME", { source: "PV", target: "OWNCONSUME", valueFromDatum: "OWNCONSUME" }],
    ["PV_UNASSIGNED", { source: "PV", target: "PV_UNASSIGNED", valueFromDatum: "PV_UNASSIGNED", hideIfSmall: true }],
    ["OWNCONSUME_TOTALCONSUMPTION", { source: "OWNCONSUME", target: "TOTALCONSUMPTION", valueFromDatum: "OWNCONSUME" }],
    ["IMPORT_TOTALCONSUMPTION", { source: "IMPORT", target: "TOTALCONSUMPTION", valueFromDatum: "IMPORT" }],
    ["CONSUMPTION_UNASSIGNED", { source: "CONSUMPTION_UNASSIGNED", target: "TOTALCONSUMPTION", valueFromDatum: "CONSUMPTION_UNASSIGNED", hideIfSmall: true }],
    ["TOTALCONSUMPTION_ELSPECIFIC", { source: "TOTALCONSUMPTION", target: "ELSPECIFIC", valueFromDatum: "ELSPECIFIC" }],
    ["TOTALCONSUMPTION_DH", { source: "TOTALCONSUMPTION", target: "DH", valueFromDatum: "DH" }],
    ["TOTALCONSUMPTION_HPU", { source: "TOTALCONSUMPTION", target: "HPU", valueFromDatum: "HPU" }],
    ["TOTALCONSUMPTION_HWH", { source: "TOTALCONSUMPTION", target: "HWH", valueFromDatum: "HWH" }],
    ["TOTALCONSUMPTION_CPU", { source: "TOTALCONSUMPTION", target: "CPU", valueFromDatum: "CPU" }],
  ]),
}

const validateOptions = ({ year, month, measuringPoint, model }: EnergyInAndOutOptions) => {
  // Validate sitewide options
  validateSitewideOptions({ year, month, measuringPoint, model })

  // Assert that required options are not undefined
  if (year === undefined || month === undefined || measuringPoint === undefined) {
    throw new OptionsNotSetError("Required options are not selected. Required options: Year, Month, Measuring point.");
  }

  // Only allowed measuring point is delivered energy (for now?)
  if (measuringPoint !== "delivered") {
    throw new InvalidOptionError("There is no data for this measuring point. Please select a different measuring point.");
  }
};

const transformToSankeyData = ({ data, model, sankeyContext, skipPercentageThreshold, options }: {
  data: TimeSeriesDataType
  model?: Model
  sankeyContext: SankeyContext
  skipPercentageThreshold: number
  options: OptionValues
}) => {
  // Filter out time series datums with no measured values
  const filteredData = filterOutNotMeasuredData(data)
  if (filteredData.size === 0) {
    throw new InvalidOptionError("No data available for the selected period.")
  }
  // Remove non-specified models from data
  const singleValueData = filterOutNonSpecifiedModelData(filteredData, model)

  // Sum up data (for each data type) for each key across all periods
  const summedData = sumData(singleValueData);

  // Create links based on data
  const { links, modeledDataLinks } = createLinksFromData(sankeyContext, summedData, skipPercentageThreshold, options);

  // Create nodes from context based on links
  const nodes = createNodesFromLinks(sankeyContext, links);

  // Throw error if no nodes or links are created
  if (nodes.length === 0 || links.length === 0) {
    throw new InvalidOptionError("No data for this option combination.");
  }

  // Return nodes and links for both measured and simulated data
  return { nodes, links, modeledDataLinks };
}

const getData = async ({ dataContext, sankeyContext, options }: {
  dataContext: FetchDataContext,
  sankeyContext: SankeyContext,
  options: EnergyInAndOutOptions,
}) => {
  // Validate options before continuing; throw error if invalid
  validateOptions(options);

  const SKIP_PERCENTAGE_THRESHOLD = 0.1; // Skip links with a value less than x% of the total value
  const { year, month, model } = options;

  // Fetch data for the selected time period
  const periodData = await fetchDataForPeriod(dataContext, year!, month!, model);

  // Transform data to sankey data format
  const sankeyData = transformToSankeyData({ data: periodData, model, sankeyContext, skipPercentageThreshold: SKIP_PERCENTAGE_THRESHOLD, options: options as OptionValues });

  return { data: sankeyData };
}

export interface EnergyInAndOutOptions {
  year?: string;
  month?: string;
  measuringPoint?: string;
  model?: string;
  showElProductionDetails?: string;
}

export default async function EnergyInAndOutPage({
  searchParams,
}: {
  searchParams?: EnergyInAndOutOptions;
}) {
  const PAGE_ID = "energy-in-out";

  const { year, month, measuringPoint, model, showElProductionDetails } = searchParams || {};

  const fullMonthText = month && OPTIONS_SITEWIDE.month.optionItems.get(month)?.label
  let chartHeaderText = "Energy in and out"
  if (year) {
    if (month === "all") {
      chartHeaderText += ` for ${year}`
    } else if (fullMonthText) {
      chartHeaderText += ` for ${fullMonthText} ${year}`
    }
  }

  try {
    // Render chart
    const sankeyContext = deliveredEnergySankeyContext;
    const { data: { nodes, links, modeledDataLinks } } = await getData({
      dataContext: fetchDataContext,
      sankeyContext: sankeyContext,
      options: { year, month, measuringPoint, model, showElProductionDetails },
    });

    return <div className='flex flex-col items-center'>
      <ChartHeader text={chartHeaderText} />
      <div className='mt-4 flex flex-row space-x-4 items-baseline text-muted-foreground text-base'>
        <span>Energy into the building</span>
        <span className='text-2xl font-bold'>⟶</span>
        <span>Energy out of the building</span>
      </div>
      <Sankey pageId={PAGE_ID} nodes={nodes} links={links} modeledDataLinks={modeledDataLinks} />
    </div>
  } catch (error) {
    if (error instanceof OptionsNotSetError) {
      // Loading
      return (
        <div className='flex flex-col items-center'>
          <ChartHeader text={chartHeaderText} />
          <div className='mt-4 flex flex-row space-x-4 items-baseline text-muted-foreground text-base'>
            <span>Energy into the building</span>
            <span className='text-2xl font-bold'>⟶</span>
            <span>Energy out of the building</span>
          </div>
          <LoadingContent />
        </div>
      )
    }

    if (!(error instanceof InvalidOptionError)) {
      console.error(error);
    }

    // Render error message
    return (
      <div className='flex flex-col items-center'>
        <ChartHeader text={chartHeaderText} />
        <ErrorAlert message={error instanceof InvalidOptionError ? error.message : "Error fetching data."} />
      </div>
    )
  }
}
