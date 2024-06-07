"use client"

import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNav } from "@/hooks/useNav";
import { ToggleButton } from "@/components/buttons/toggle-button";
import { OPTIONS_SITEWIDE } from "@/config/options";
import { useOptions } from "@/context/OptionsContext";
import { useNavbar } from "@/context/NavbarContext";
import { Info } from "@/components/info";


function Breadcrumbs({ breadcrumbs }: {
  breadcrumbs: { title: string; href: string; }[]
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, i) => (
          <Fragment key={i}>
            {i > 0 && <BreadcrumbSeparator />} {/* Separator for all but the first item */}
            <BreadcrumbItem>
              <BreadcrumbLink
                href={breadcrumb.href}
                className="text-base"
              >
                {breadcrumb.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function SiteHeader() {
  const { isOpen, setIsOpen } = useNavbar();
  const { breadcrumbs } = useNav()
  const { optionValues, changeOptionValue, allOptionDetails } = useOptions()

  return (
    <header className="flex flex-row justify-between items-center text-lg sticky h-16 px-4 top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Sidebar button and breadcrumbs */}
      {!isOpen && (
        <div className="flex flex-row">
          <ToggleButton
            className={"cursor-pointer h-6 w-6 rotate-180"}
            onClick={() => setIsOpen(true)}
          />
          <nav className="mx-8">
            <Breadcrumbs breadcrumbs={breadcrumbs} />
          </nav>
        </div>
      )}
      {/* Options: dynamically generated from options hook */}
      <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
        {optionValues && Object.entries(optionValues).map(([key, value]) => {
          const option = OPTIONS_SITEWIDE[key as keyof typeof OPTIONS_SITEWIDE];
          if (!option || typeof value !== "string") return <></>;

          const infoText = option.infoText

          return (
            <div key={key} className="flex items-baseline">
              {infoText && <Info className="opacity-70 mx-1">{infoText}</Info>}
              {option.label}:
              <Select value={value} onValueChange={(newValue) => changeOptionValue(key, newValue)}>
                <SelectTrigger className="ml-4 w-fit text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(option.optionItems).map(([optionKey, optionItem]) => (
                    <SelectItem key={optionKey as string} value={optionKey as string}>{optionItem.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </header>
  )
}
