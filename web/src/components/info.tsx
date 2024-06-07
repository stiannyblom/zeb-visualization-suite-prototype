import { InfoCircledIcon } from "@radix-ui/react-icons"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import React from "react";

export const Info = ({ className, children }: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger className="cursor-default"><InfoCircledIcon className={className} /></TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-wrap text-base">
            {children}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

  );
}
