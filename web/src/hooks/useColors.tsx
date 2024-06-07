import { useMemo } from "react";

import { Key, KeyColors, KeyInfoMap } from "@/types";
import { convertHexToRGBA } from "@/utils/design";
import { fallbackChartColors } from "@/config/color";


export const useColors = (keyInfoMap: KeyInfoMap, focusedKey: Key | null): KeyColors => {
  return useMemo(() => {
    const colors: KeyColors = new Map();
    let fallbackIndex = 0;

    keyInfoMap.forEach((keyInfo, key) => {
      const baseColor = keyInfo.color || fallbackChartColors[fallbackIndex++ % fallbackChartColors.length];
      let finalColor = baseColor;

      // If the key is unfocused, apply a 20% opacity to the color
      if (focusedKey && key !== focusedKey) {
        const rgbaColor = convertHexToRGBA(baseColor, 0.2);
        finalColor = rgbaColor || baseColor;  // Fallback to base color if rgba conversion fails
      }

      colors.set(key, finalColor);
    });

    return colors;
  }, [keyInfoMap, focusedKey]);
};

