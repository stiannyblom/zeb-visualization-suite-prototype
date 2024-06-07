import React, { Fragment, useMemo } from "react";
import { CustomLayer, CustomLayerProps } from "@nivo/line";
import { ScaleBand, ScaleLinear } from "d3-scale";
import { line } from "d3-shape";

import { LineSerie } from "@/types";
import { BACKGROUND_COLOR } from "@/config/color";

export const useCustomLineLayer = (series: LineSerie[], reverse: boolean) => {
  const POSITIVE_COLOR = "green";
  const NEGATIVE_COLOR = "#FF4062";

  const CIRCLE_SIZE = 5;
  const CIRCLE_BORDER_WIDTH = 3;

  const TRIANGLE_SIZE = 16;

  return useMemo(() => {
    const CustomLineLayer = (props: CustomLayerProps) => {
      const { xScale, yScale, innerWidth, innerHeight, data, lineWidth } = props;

      const maskId = "lineMask"

      const xScaleBand = xScale as ScaleBand<string>;
      const xScaleLinear = xScale as ScaleLinear<number, number>;
      const yScaleLinear = yScale as ScaleLinear<number, number>;

      const newLineWidth = lineWidth ?? 3;

      const lineGenerator = line()
        .x((d: any) => xScaleBand(d[0]) ?? xScaleLinear(0))
        .y((d) => yScaleLinear(d[1]));

      return data.map(({ id, data: d }) => {
        const serie = series.find(serie => serie.label === id)

        const pathData = lineGenerator(d.map(({ x, y }) => [x as number, y as number])) as string

        const Points = () => <>
          {d.map(({ x, y }) => {
            const xPos = xScaleBand(x as string) ?? xScaleLinear(0);
            const yPos = yScaleLinear(y as number);

            if (serie?.pointType === "none") {
              return null;
            }

            if (serie?.pointType === "circle") {
              return <circle
                key={`point-${id}-${x}`}
                cx={xPos}
                cy={yPos}
                r={CIRCLE_SIZE}
                fill={BACKGROUND_COLOR}
                stroke={serie?.color}
                strokeWidth={CIRCLE_BORDER_WIDTH}
              />
            }

            if (serie?.pointType === "triangle") {
              return <polygon
                key={`point-${id}-${x}`}
                points={`
                ${xPos},${yPos - TRIANGLE_SIZE / 2}
                ${xPos - TRIANGLE_SIZE / 2},${yPos + TRIANGLE_SIZE / 2}
                ${xPos + TRIANGLE_SIZE / 2},${yPos + TRIANGLE_SIZE / 2}
              `}
                fill={"white"}
              />
            }

          })}
        </>

        let svgElement: JSX.Element | null = null;

        const hasDynamicLineColor = serie?.dynamicLineColor === true;
        if (hasDynamicLineColor) {
          svgElement = (
            <g key={`mask-${id}`}>
              <mask id={maskId}>
                {data.map(({ id, data: d }) => {
                  return <>
                    {serie?.lineStyle &&
                      // Have to add a black background because of the colored mask
                      <path
                        d={pathData}
                        fill="none"
                        strokeWidth={newLineWidth}
                        stroke={BACKGROUND_COLOR}
                      />
                    }
                    <path
                      d={pathData}
                      fill="none"
                      strokeWidth={newLineWidth}
                      stroke={"#FFFFFF"}
                      style={
                        serie?.lineStyle === "dashed"
                          ? {
                            strokeDasharray: "10, 10",
                          }
                          : {}
                      }
                    />
                  </>
                })}
              </mask>

              <rect
                x="0"
                y="0"
                height={yScaleLinear(0) + newLineWidth / 2}
                width={innerWidth}
                mask={`url(#${maskId})`}
                fill={reverse ? NEGATIVE_COLOR : POSITIVE_COLOR}
              />

              <rect
                x="0"
                y={yScaleLinear(0) + newLineWidth / 2}
                height={innerHeight - yScaleLinear(0)}
                width={innerWidth}
                mask={`url(#${maskId})`}
                fill={reverse ? POSITIVE_COLOR : NEGATIVE_COLOR}
              />
              <Points />
            </g>
          );
        } else {
          svgElement = (
            <Fragment key={`line-${id}`}>
              {serie?.lineStyle &&
                // Have to add a black background because of the colored mask
                <path
                  d={pathData}
                  fill="none"
                  strokeWidth={newLineWidth}
                  stroke={BACKGROUND_COLOR}
                />
              }
              <path
                d={pathData}
                fill="none"
                strokeWidth={newLineWidth}
                stroke={serie?.color}
                style={
                  serie?.lineStyle === "dashed"
                    ? {
                      strokeDasharray: "10, 10",
                    }
                    : {}
                }
              />
              <Points />
            </Fragment>
          )
        }

        return svgElement;
      })

    }

    return CustomLineLayer as CustomLayer
  }, [series, reverse])
}
