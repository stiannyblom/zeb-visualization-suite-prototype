"use client"

import { Theme } from "@nivo/core";
import { Line as NivoLine } from "@nivo/line";

import { LineSerie, Serie } from "@/types";
import { useNavbar } from "@/context/NavbarContext";
import { roundToDecimalPlaces } from "@/utils/data";
import { NUMBERS_LOCALE } from "@/config/locale";
import { useCustomAreaLayer } from "@/components/charts/Line/layers/AreaLayer";
import { useCustomLineLayer } from "@/components/charts/Line/layers/LineLayer";
import { formatMonthAxisValue } from "@/utils/charts";
import { CirclePoint, Legend, TrianglePoint } from "@/components/charts/Line/customLegend";
import { useOptions } from "@/context/OptionsContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "@/components/info";
import { TOOLTIP_BACKGROUND_COLOR } from "@/config/color";


const convertToNivoLineSerie = (lineSerie: LineSerie): Serie => {
  const data = lineSerie.data.map(d => {
    const { x, y: { positiveContribution, negativeContribution } } = d;

    if (positiveContribution === null || negativeContribution === null) {
      return { x, y: null };
    }

    return {
      x,
      y: positiveContribution - negativeContribution,
    };
  });

  return {
    id: lineSerie.label,
    data,
    color: lineSerie.color,
  };
}

const accumulateDifference = (data: Serie["data"]) => {
  const result: Serie["data"] = [];

  for (const [idx, datum] of data.entries()) {
    const { x, y } = datum;
    const previousValue = result[idx - 1]?.y ?? 0;

    if (typeof y === "number" && typeof previousValue === "number") {
      result.push({ x, y: previousValue + y });
    }
  }

  return result;
}

const extractMaxAndMinValues = (data: Serie[]): { max: number; min: number } => {
  let max = -Infinity;
  let min = Infinity;

  data.forEach(serie => {
    serie.data.forEach(datum => {
      if (typeof datum.y === "number") {
        max = Math.max(max, datum.y);
        min = Math.min(min, datum.y);
      }
    })
  })

  return { max, min };
}


interface LineProps {
  pageId: string;
  measuredLineSerie: LineSerie;
  modeledLineSerie: LineSerie;
  accumulate?: boolean;
  enableColoredArea?: boolean;
  reverse?: boolean;
}

export const Line = ({ pageId, measuredLineSerie, modeledLineSerie, accumulate = false, enableColoredArea = false, reverse = false }: LineProps) => {
  const { isOpen: sidebarIsOpen } = useNavbar();
  const { pageSpecificOptionValues, changePageSpecificOptionValue, getPageSpecificOptionDetails } = useOptions();

  const lineSeries = [measuredLineSerie, modeledLineSerie];

  // Deep copy and convert to correct data format
  const measuredData = convertToNivoLineSerie(structuredClone(measuredLineSerie))
  const modeledData = convertToNivoLineSerie(structuredClone(modeledLineSerie))
  const data = [measuredData, modeledData];

  // Accumulate difference if needed
  if (accumulate) {
    data.forEach(d => d.data = accumulateDifference(d.data))
  }

  // Extract colors
  const colors = data.map(d => d.color);

  // Find max and min values for y-axis
  const { max, min } = extractMaxAndMinValues(data);

  // Create custom layers
  const customAreaLayer = useCustomAreaLayer(measuredLineSerie, reverse);
  const customLineLayer = useCustomLineLayer(lineSeries, reverse);

  // Options
  const pageOptions = pageSpecificOptionValues[pageId];
  const showAsCO2 = pageOptions?.showAsCO2 === "true";
  const showASCO2InfoText = getPageSpecificOptionDetails(pageId, "showAsCO2")?.infoText;
  const toggleShowAsCO2 = () => changePageSpecificOptionValue(pageId, "showAsCO2", showAsCO2 ? "false" : "true");

  const unit = showAsCO2 ? "kg CO₂ eq." : "kWh";

  const THEME: Theme = {
    dots: {
      text: { fill: '#BBBABD', fontSize: 12 },
    },
    crosshair: {
      line: {
        stroke: '#ffffff',
        strokeWidth: 1,
        strokeDasharray: '6 6',
      },
    },
    text: { fill: '#BBBABD', fontSize: 12, fontWeight: 700 }
  };

  return (
    <div className="flex flex-row">
      <NivoLine
        data={data}
        width={sidebarIsOpen ? 1250 : 1500}
        height={700}
        margin={{ top: 40, right: 40, bottom: 40, left: 160 }}
        animate={false}
        theme={THEME}
        enableTouchCrosshair={true}
        enableSlices='x'
        curve="monotoneX"
        pointSize={0}
        enablePointLabel={true}
        pointLabel={d => `${roundToDecimalPlaces(d.y as number, 0).toLocaleString(NUMBERS_LOCALE)}`}
        pointLabelYOffset={-20}
        enableGridY={true}
        enableGridX={false}
        xScale={{
          type: 'point',
        }}
        yScale={{
          type: 'linear',
          nice: true,
          min: min,
          max: max,
        }}
        enableArea={enableColoredArea}
        layers={[
          'grid',
          'markers',
          'axes',
          'crosshair',
          enableColoredArea ? customAreaLayer : 'areas',
          customLineLayer,
          'points', // Only labels since points are set to 0 and instead rendered in line layer
          'slices',
          'mesh',
        ]}
        lineWidth={3}
        colors={colors}
        axisBottom={{
          format: formatMonthAxisValue,
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legendPosition: 'middle',
          legendOffset: 40,
        }}
        axisLeft={{
          format: (v) => `${v.toLocaleString(NUMBERS_LOCALE)} ${unit}`,
          tickSize: 20,
          tickPadding: 30,
        }}
        markers={
          [{
            axis: 'y',
            value: 0,
            lineStyle: { stroke: 'rgba(256, 256, 256, 0.4)', strokeWidth: 5 },
          }]
        }
        sliceTooltip={({ slice }) => {
          const time = slice.points[0].data.x as string;

          const measuredValue = measuredData.data.find(d => d.x === time)?.y;
          const measuredValueString = measuredValue != null ? `${roundToDecimalPlaces(measuredValue, 0).toLocaleString(NUMBERS_LOCALE)} ${unit}` : undefined;

          const modeledValue = modeledData.data.find(d => d.x === time)?.y;
          const modeledValueString = modeledValue != null ? `${roundToDecimalPlaces(modeledValue, 0).toLocaleString(NUMBERS_LOCALE)} ${unit}` : undefined;

          const measuredPointType = measuredLineSerie.pointType;
          const modeledPointType = modeledLineSerie.pointType;

          const SVG_SIZE = 25;

          const CIRCLE_SIZE = 6;
          const CIRCLE_BORDER_WIDTH = 4;
          const TRIANGLE_SIZE = 16;

          return (
            <div
              style={{ backgroundColor: TOOLTIP_BACKGROUND_COLOR }}
              className="flex flex-col space-y-3 p-3 text-base"
            >
              <div className="flex flex-row">
                {measuredPointType === "circle" && (
                  <CirclePoint color={measuredLineSerie.color} svgSize={SVG_SIZE} size={CIRCLE_SIZE} borderWidth={CIRCLE_BORDER_WIDTH} />
                )}
                {measuredPointType === "triangle" && (
                  <TrianglePoint color={measuredLineSerie.color} svgSize={SVG_SIZE} size={TRIANGLE_SIZE} />
                )}
                <div>Measured: {measuredValueString}</div>
              </div>
              <div className="flex flex-row">
                {modeledPointType === "circle" && (
                  <CirclePoint color={modeledLineSerie.color} svgSize={SVG_SIZE} size={CIRCLE_SIZE} borderWidth={CIRCLE_BORDER_WIDTH} />
                )}
                {modeledPointType === "triangle" && (
                  <TrianglePoint color={modeledLineSerie.color} svgSize={SVG_SIZE} size={TRIANGLE_SIZE} />
                )}
                <div>Modeled: {modeledValueString}</div>
              </div>
            </div>
          )
        }}
      />
      <div className="flex flex-col space-y-16 translate-y-16">
        <Legend lineSeries={lineSeries} className="space-y-2 cursor-default select-none" />
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Switch id="emission-mode" checked={showAsCO2} onCheckedChange={toggleShowAsCO2} />
            <Label htmlFor="emission-mode">Show as CO2 eq. emissions</Label>
            {showASCO2InfoText &&
              <Info className="opacity-70">{showASCO2InfoText}</Info>
            }
          </div>
        </div>
        {/* TODO: Uncomment this when life cycle page is ready */}
        {/* {showAsCO2 && (
          <Link href={createHref({
            targetpath: findPagePathById(navConfig, "life-cycle") ?? "/",
          })}>
            <ArrowBigRightDash className="w-12 h-12 cursor-pointer" />
          </Link>
        )} */}
      </div>
    </div>
  )
}
