import { BACKGROUND_COLOR } from "@/config/color";
import { LineSerie } from "@/types";
import { cn } from "@/utils/design";


export const CirclePoint = ({ color, svgSize, size, borderWidth }: { color: string, svgSize: number, size: number, borderWidth: number }) => {
  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="mr-2"
    >
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={size}
        fill={BACKGROUND_COLOR}
        stroke={color}
        strokeWidth={borderWidth}
      />
    </svg>
  );
}

export const TrianglePoint = ({ color, svgSize, size }: { color: string, svgSize: number, size: number }) => {
  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="mr-2"
    >
      <polygon
        points={`
          ${svgSize / 2},${svgSize / 2 - size / 2}
          ${svgSize / 2 - size / 2},${svgSize / 2 + size / 2}
          ${svgSize / 2 + size / 2},${svgSize / 2 + size / 2}
        `}
        fill={color}
      />
    </svg>
  );
}

interface LegendProps {
  lineSeries: LineSerie[];
  className?: string;
};

export const Legend = ({ lineSeries, className }: LegendProps) => {
  const SVG_SIZE = 25;

  const CIRCLE_SIZE = 6;
  const CIRCLE_BORDER_WIDTH = 4;
  const TRIANGLE_SIZE = 16;

  return (
    <div className={cn(
      "flex flex-col items-start",
      className,
    )}>
      {lineSeries.map((lineSerie) => {
        let point = null;

        if (lineSerie.pointType === "circle") {
          point = <CirclePoint color={lineSerie.color} svgSize={SVG_SIZE} size={CIRCLE_SIZE} borderWidth={CIRCLE_BORDER_WIDTH} />
        } else if (lineSerie.pointType === "triangle") {
          point = <TrianglePoint color={lineSerie.color} svgSize={SVG_SIZE} size={TRIANGLE_SIZE} />
        }

        return (
          <div key={lineSerie.id} className="flex items-center">
            {point}
            <span className="opacity-80">{lineSerie.label}</span>
          </div>
        )
      })}
    </div>
  );
}
