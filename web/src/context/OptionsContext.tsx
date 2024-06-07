"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { OptionKey, OptionType, OptionValues, Options, PageSpecificOptionValues, PageSpecificOptions } from '@/types';
import { OPTIONS_PAGE_SPECIFIC, OPTIONS_SITEWIDE } from '@/config/options';
import { createHrefFromOptionValues, findPageIdByPath } from '@/utils/router';
import { navConfig } from '@/config/nav';

const OptionsContext = createContext<{
  allOptionDetails: {
    siteWide: Options;
    pageSpecific: PageSpecificOptions;
  };
  optionValues: OptionValues;
  setOptionValues: (values: OptionValues) => void;
  changeOptionValue: (optionKey: OptionKey, newValue: string) => void;
  pageSpecificOptionValues: PageSpecificOptionValues;
  changePageSpecificOptionValue: (pageId: string, optionKey: OptionKey, newValue: OptionValues[0]) => void;
  setPageSpecificOptionValues: (values: PageSpecificOptionValues) => void;
  getPageSpecificOptionDetails: (pageId: string, key: OptionKey) => OptionType
} | undefined>(undefined);

export const useOptions = () => {
  const context = useContext(OptionsContext);
  if (!context) throw new Error('useOptions must be used within an OptionsProvider');
  return context;
};

export const OptionsProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams()

  // Initialize site-wide option values from URL params
  const [optionValues, setOptionValues] = useState<OptionValues>(() => {
    const urlParams = new URLSearchParams(searchParams);
    const defaults: OptionValues = {};
    for (const key in OPTIONS_SITEWIDE) {
      defaults[key] = urlParams.get(key) || OPTIONS_SITEWIDE[key].default;
    }
    return defaults;
  });

  // Initialize page specific option values from URL params
  const [pageSpecificOptionValues, setPageSpecificOptionValues] = useState<PageSpecificOptionValues>(() => {
    const urlParams = new URLSearchParams(searchParams);
    const defaults: PageSpecificOptionValues = {};
    for (const page in OPTIONS_PAGE_SPECIFIC) {
      defaults[page] = {};
      for (const key in OPTIONS_PAGE_SPECIFIC[page]) {
        const defaultValue = OPTIONS_PAGE_SPECIFIC[page][key].default;
        const urlParamsKey = urlParams.get(key);
        if (urlParamsKey) {
          if (typeof defaultValue === 'boolean') {
            defaults[page][key] = urlParamsKey === "true";
          } else {
            defaults[page][key] = urlParamsKey;
          }
        } else {
          defaults[page][key] = defaultValue;
        }
      }
    }
    return defaults;
  });

  const allOptionDetails = {
    siteWide: OPTIONS_SITEWIDE,
    pageSpecific: OPTIONS_PAGE_SPECIFIC
  }

  const getPageSpecificOptionDetails = (pageId: string, key: OptionKey) => {
    return OPTIONS_PAGE_SPECIFIC[pageId][key];
  }

  const updateURL = (newOptionValues: OptionValues) => {
    const href = createHrefFromOptionValues(newOptionValues, pathname)
    router.replace(href);
  }

  // Update site-wide option values in URL when they change
  const changeOptionValue = (optionKey: OptionKey, newValue: string) => {
    const newOptionValues = { ...optionValues, [optionKey]: newValue };
    setOptionValues(newOptionValues);

    const currentPageId = findPageIdByPath(navConfig, pathname)

    let mergedOptionValues: OptionValues = newOptionValues;
    if (currentPageId) {
      const pageOptionValues = pageSpecificOptionValues[currentPageId] || {};
      mergedOptionValues = { ...newOptionValues, ...pageOptionValues };
    }

    updateURL(mergedOptionValues);
  };

  // Update page-specific option values in URL when they change
  const changePageSpecificOptionValue = (pageId: string, optionKey: OptionKey, newValue: OptionValues[0]) => {
    const newPageSpecificOptionValues = { ...pageSpecificOptionValues, [pageId]: { ...pageSpecificOptionValues[pageId], [optionKey]: newValue } };
    setPageSpecificOptionValues(newPageSpecificOptionValues);

    const mergedOptionValues = { ...optionValues, ...newPageSpecificOptionValues[pageId] };

    updateURL(mergedOptionValues);
  }

  // Update URL with options when page changes
  useEffect(() => {
    const currentPageId = findPageIdByPath(navConfig, pathname);
    if (!currentPageId) {
      return;
    }

    const pageOptionValues = pageSpecificOptionValues[currentPageId] || {};
    const mergedOptionValues = { ...optionValues, ...pageOptionValues };

    const href = createHrefFromOptionValues(mergedOptionValues, pathname)
    router.replace(href);
  }, [pathname]); // FIXME: Bad dependency array, find a better way to do this

  return (
    <OptionsContext.Provider value={{
      allOptionDetails,
      optionValues,
      setOptionValues,
      changeOptionValue,
      pageSpecificOptionValues,
      changePageSpecificOptionValue,
      setPageSpecificOptionValues,
      getPageSpecificOptionDetails
    }}>
      {children}
    </OptionsContext.Provider>
  );
};
