import { Metadata } from "next";

import { ChartHeader, ErrorAlert, Line } from "@/components/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { OPTIONS_SITEWIDE } from "@/config/options";
import { FetchDataContext, Model, TimeSeriesDataType, LinesContext } from "@/types";
import { createLinesFromData, fetchDataForPeriod } from "@/utils/accumulatedBalance";
import { filterOutNonSpecifiedModelData } from "@/utils/data";
import { InvalidOptionError, OptionsNotSetError, validateSitewideOptions } from "@/utils/options";
import { Info } from "@/components/info";
import { navConfig } from "@/config/nav";
import { findNavItemById } from "@/utils/router";

export const metadata: Metadata = {
  title: "Accumulated emissions and el. energy balance",
}

const CO2_FACTOR_EL = 0.132; // kg CO2 eq. / kWh
const CO2_FACTOR_DH = 0.198; // kg CO2 eq. / kWh

const deliveredEnergyFetchDataContext: FetchDataContext = {
  direct: {
    measured: new Map([
      ["new_point_C_building", new Map([
        // Production
        ["PV", { carrier: "Electric", field: "PV", co2Factor: CO2_FACTOR_EL }],
        // Consumption
        ["ELSPECIFIC", { carrier: "Electric", field: "ELSPECIFIC", co2Factor: CO2_FACTOR_EL }],
        ["HPU", { carrier: "Electric", field: "HPU", co2Factor: CO2_FACTOR_EL }],
        ["HWH", { carrier: "Electric", field: "HWH", co2Factor: CO2_FACTOR_EL }],
        ["CPU", { carrier: "Electric", field: "CPU", co2Factor: CO2_FACTOR_EL }],
        ["DH", { carrier: "Thermal", field: "DH", co2Factor: CO2_FACTOR_DH }],
      ])]
    ]),
    modeled: new Map([
      ["new_point_C_building_model", new Map([
        // Production
        ["PV", { carrier: "Unknown", field: "PV", co2Factor: CO2_FACTOR_EL }],
        // Consumption
        ["ELSPECIFIC", { carrier: "Unknown", field: "ELSPECIFIC", co2Factor: CO2_FACTOR_EL }],
        ["HPU", { carrier: "Unknown", field: "HPU", co2Factor: CO2_FACTOR_EL }],
        ["HWH", { carrier: "Unknown", field: "HWH", co2Factor: CO2_FACTOR_EL }],
        ["CPU", { carrier: "Unknown", field: "CPU", co2Factor: CO2_FACTOR_EL }],
        ["DH", { carrier: "Unknown", field: "DH", co2Factor: CO2_FACTOR_DH }],
      ])]
    ])
  },
  calculated: new Map([
    ["TOTAL_PRODUCTION", { calcExpression: "PV", convertNullsToZero: true }],
    ["TOTAL_CONSUMPTION", { calcExpression: "ELSPECIFIC + HPU + HWH + CPU + DH", convertNullsToZero: true }],
  ]),
}

const deliveredEnergyAccumulatedLinesContext: LinesContext = {
  measured: {
    id: "ACCUMULATED_MEASURED",
    label: "Measured",
    valueFromDatum: {
      positiveContribution: "TOTAL_PRODUCTION",
      negativeContribution: "TOTAL_CONSUMPTION",
    },
    color: "#FFFFFF",
    dynamicLineColor: true, // Adds red color to negative values and green to positive values
    lineStyle: "solid",
    pointType: "circle",
  },
  modeled: {
    id: "ACCUMULATED_MODELED",
    label: "Simulated",
    valueFromDatum: {
      positiveContribution: "TOTAL_PRODUCTION",
      negativeContribution: "TOTAL_CONSUMPTION",
    },
    color: "#FFFFFF",
    lineStyle: "dashed",
    pointType: "triangle",
  }
}

const validateOptions = ({ year, month, measuringPoint, model }: AccumulatedBalanceOptions) => {
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

const transformToLineData = ({ data, model, lineContext }: {
  data: TimeSeriesDataType
  model?: Model
  lineContext: LinesContext
}) => {
  // Remove non-specified models from data
  let lineData = filterOutNonSpecifiedModelData(data, model)

  // Create lines
  const { measuredLineSerie, modeledLineSerie } = createLinesFromData(lineContext, lineData);

  // Throw error if no line for measured data is created
  if (measuredLineSerie.data.length === 0) {
    throw new InvalidOptionError("No data for this option combination.");
  }

  // Return lines for both measured and simulated data
  return { measuredLineSerie, modeledLineSerie }
}

const getData = async ({ dataContext, lineContext, options }: {
  dataContext: FetchDataContext,
  lineContext: LinesContext,
  options: Omit<AccumulatedBalanceOptions, "showAsCO2"> & { convertToCO2: boolean }
}) => {
  // Validate options before continuing; throw error if invalid
  validateOptions(options);

  const { year, month, model, convertToCO2 } = options;

  // Fetch data for the selected time period
  const periodData = await fetchDataForPeriod(dataContext, year!, month!, model, convertToCO2);

  // Transform data to line data format
  const lineData = transformToLineData({ data: periodData, model, lineContext });

  return { data: lineData };
}


export interface AccumulatedBalanceOptions {
  year?: string;
  month?: string;
  measuringPoint?: string;
  model?: string;
  showAsCO2?: string;
}

export default async function AccumulatedBalancePage({
  searchParams,
}: {
  searchParams?: AccumulatedBalanceOptions;
}) {
  const PAGE_ID = "accumulated-balance";

  const { year, month, measuringPoint, model, showAsCO2 } = searchParams || {};

  let chartHeaderText = "Accumulated balance"

  const convertToCO2 = showAsCO2 === "true"
  if (convertToCO2) {
    chartHeaderText = "Accumulated CO₂ emissions balance"
  } else {
    chartHeaderText = "Accumulated energy balance"
  }

  const fullMonthText = month && OPTIONS_SITEWIDE.month.optionItems.get(month)?.label
  if (year) {
    if (month === "all") {
      chartHeaderText += ` for ${year}`
    } else if (fullMonthText) {
      chartHeaderText += ` for ${fullMonthText} ${year}`
    }
  }

  try {
    // Render chart
    const fetchDataContext = deliveredEnergyFetchDataContext;
    const lineContext = deliveredEnergyAccumulatedLinesContext;
    const { data: { measuredLineSerie, modeledLineSerie } } = await getData({
      dataContext: fetchDataContext,
      lineContext,
      options: { year, month, measuringPoint, model, convertToCO2 },
    });

    const infoText = findNavItemById(navConfig.items, PAGE_ID)?.infoText;

    return <div className='flex flex-col items-center'>
      <div className="flex flex-row space-x-2">
        <ChartHeader text={chartHeaderText} />
        {infoText && <Info className="w-5 h-5 opacity-70">{infoText}</Info>}
      </div>
      <div className='mt-4 flex flex-row space-x-4 items-baseline text-muted-foreground text-base'>
        {!convertToCO2 &&
          <p>Accumulated energy <span className="text-red-400">deficit</span> and <span className="text-green-400">surplus</span></p>
        }
        {convertToCO2 &&
          <p>Accumulated CO₂ <span className="text-red-400">emissions</span> and <span className="text-green-400">offsets</span></p>
        }
      </div>
      <Line pageId={PAGE_ID} measuredLineSerie={measuredLineSerie} modeledLineSerie={modeledLineSerie} accumulate enableColoredArea reverse={convertToCO2} />
    </div>
  } catch (error) {
    if (error instanceof OptionsNotSetError) {
      // Loading
      return (
        <div className='flex flex-col items-center'>
          <ChartHeader text={chartHeaderText} />
          <Skeleton className="mt-8 w-[1300px] h-[600px]" />
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
