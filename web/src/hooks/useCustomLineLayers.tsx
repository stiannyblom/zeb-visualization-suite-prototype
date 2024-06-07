import { useMemo } from 'react';
import { BarCustomLayer, BarCustomLayerProps, BarTooltipProps, ComputedBarDatum } from "@nivo/bar";
import { ScaleBand, ScaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useTooltip } from '@nivo/tooltip';

import { BarTimeDatum, KeyColors, KeyInfoMap, SVGElementCustomClickEvent } from '@/types';
import { calculateMidBarXPosition, calculateYPosition, checkIsClickable, getUniqueKeys, getValue } from '@/utils/barChart';

interface CustomMouseEnterEventProps {
  event: React.MouseEvent<SVGElement, MouseEvent>;
  position: {
    x: number;
    y: number;
  };
  tooltipProps: BarTooltipProps<BarTimeDatum>;
}

export const useCustomLineLayers = (lineData: BarTimeDatum[], keyInfoMap: KeyInfoMap, keyColors: KeyColors, onPointClick?: SVGElementCustomClickEvent) => {
  const uniqueKeys = Array.from(getUniqueKeys(lineData));

  return useMemo(() => {
    const layers = uniqueKeys.map(key => {
      const CustomLineLayer = ({ bars, xScale, yScale, tooltip, margin }: BarCustomLayerProps<BarTimeDatum>): JSX.Element | null => {
        const { showTooltipAt, hideTooltip } = useTooltip();

        const scaleBand = xScale as ScaleBand<string>;
        const scaleLinear = yScale as ScaleLinear<number, number>;

        // Calculate line positions
        const pointPositionMap = {
          x: new Map<string, number>(),
          y: new Map<string, number>(),
        }
        bars.forEach(bar => {
          const time = bar.data.data.time;
          const yValue = getValue(lineData, time, key) // ?? 0;

          if (yValue === undefined) return; // Skip if there's no data

          pointPositionMap.x.set(time, calculateMidBarXPosition(scaleBand, bar));
          pointPositionMap.y.set(time, calculateYPosition(scaleLinear, yValue));
        })

        // TODO: Break line if there's no data
        const lineGenerator = line<ComputedBarDatum<BarTimeDatum>>()
          .x((bar) => pointPositionMap.x.get(bar.data.data.time) ?? 0)
          .y((bar) => pointPositionMap.y.get(bar.data.data.time) ?? 0);

        const lineColor = keyColors.get(key) ?? "white";

        // Show tooltip on mouse enter event
        const handleMouseEnter = ({ event, position, tooltipProps }: CustomMouseEnterEventProps) => {
          const isClickable = checkIsClickable(keyInfoMap, key);
          if (isClickable) event.currentTarget.style.cursor = "pointer";
          showTooltipAt(
            <>{tooltip(tooltipProps)}</>,
            [position.x, position.y],
            'top'
          )
        }
        const handleMouseLeave = () => hideTooltip()

        const barsWithLineData = bars.filter(bar => bar.data.id === key && pointPositionMap.x.has(bar.data.data.time) && pointPositionMap.y.has(bar.data.data.time));
        const pathData = lineGenerator(barsWithLineData) ?? undefined;
        return pathData ? (
          <>
            <path
              d={pathData}
              fill="none"
              stroke={lineColor}
              strokeWidth="3"
              strokeDasharray={keyInfoMap.get(key)?.lineType === "dashed" ? "10" : undefined}
              style={{ pointerEvents: "none" }}
            />
            {barsWithLineData.map(bar => {
              const time = bar.data.data.time;

              const x = pointPositionMap.x.get(time) ?? 0;
              const absX = x + margin.left;
              const y = pointPositionMap.y.get(time) ?? 0;
              const absY = y + margin.top;

              const value = getValue(lineData, time, key) ?? 0; // FIXME: Handle undefined

              return (
                <circle
                  key={bar.key}
                  cx={x}
                  cy={y}
                  r={5}
                  fill="black" // TODO: Use bg color (defined by theme)
                  stroke={lineColor}
                  strokeWidth="3"
                  onMouseOver={event => {
                    handleMouseEnter({
                      event,
                      position: {
                        x: absX,
                        y: absY,
                      },
                      tooltipProps: {
                        id: key,
                        value: value,
                        color: lineColor,
                      } as BarTooltipProps<BarTimeDatum>
                    })
                  }}
                  onMouseLeave={handleMouseLeave}
                  onClick={(event) => onPointClick?.(event, key, time)}
                />
              )
            })}
          </>
        ) : null;
      };
      return CustomLineLayer as BarCustomLayer<BarTimeDatum>;
    });

    return layers;
  }, [lineData, keyInfoMap, uniqueKeys, keyColors, onPointClick])
}
