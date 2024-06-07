import React, { Fragment, useMemo } from "react";
import { CustomLayer, CustomLayerProps } from "@nivo/line";
import { ScaleBand, ScaleLinear } from "d3-scale";
import { area } from "d3-shape";
import { Defs, linearGradientDef } from "@nivo/core";

import { LineSerie } from "@/types";

export const useCustomAreaLayer = (lineSerie: LineSerie, reverse: boolean) => {
  return useMemo(() => {
    const CustomAreaLayer = (props: CustomLayerProps) => {
      const { xScale, yScale, innerHeight, innerWidth, data } = props;

      const serie = data.find(serie => serie.id === lineSerie.label)
      if (!serie) {
        return null
      }

      const maskId = "areaMask"

      const xScaleBand = xScale as ScaleBand<string>;
      const xScaleLinear = xScale as ScaleLinear<number, number>;
      const yScaleLinear = yScale as ScaleLinear<number, number>;

      const areaGenerator = area()
        .x((d: any) => xScaleBand(d[0]) ?? xScaleLinear(0))
        .y0(() => yScaleLinear(0))
        .y1((d) => yScaleLinear(d[1]));

      return (
        <Fragment>
          <Defs
            defs={[
              linearGradientDef("positiveGradient", [
                { offset: 0, color: "green", opacity: 0.4 },
                { offset: 100, color: "green", opacity: 0.1 },
              ]),
              linearGradientDef("negativeGradient", [
                { offset: 0, color: "#FF4062", opacity: 0.1 },
                { offset: 100, color: "#FF4062", opacity: 0.4 },
              ]),
            ]}
          />
          <g>
            <mask id={maskId}>
              <path
                d={areaGenerator(serie.data.map(({ x, y }) => [x as number, y as number])) as string}
                fill="#fff"
              />
            </mask>
            <rect
              x="0"
              y="0"
              height={yScaleLinear(0)}
              width={innerWidth}
              mask={`url(#${maskId})`}
              fill={reverse ? "url(#negativeGradient)" : "url(#positiveGradient)"}
            />
            <rect
              x="0"
              y={yScaleLinear(0) + 0.1}
              height={innerHeight - yScaleLinear(0)}
              width={innerWidth}
              mask={`url(#${maskId})`}
              fill={reverse ? "url(#positiveGradient)" : "url(#negativeGradient)"}
            />
          </g>
        </Fragment>
      );
    }

    return CustomAreaLayer as CustomLayer
  }, [lineSerie.label, reverse])
}
