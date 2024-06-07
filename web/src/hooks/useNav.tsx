import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { navConfig } from "@/config/nav";
import { createHrefFromOptionValues, findPagePathById, recursivelyGenerateBreadcrumbsNew } from "@/utils/router";
import { Breadcrumb, OptionValues } from "@/types";
import { useOptions } from "@/context/OptionsContext";

export const useNav = () => {
  const pathname = usePathname();
  const router = useRouter()
  const { optionValues, setOptionValues, pageSpecificOptionValues, setPageSpecificOptionValues } = useOptions()

  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  // Create a new href object based on existing or updated option values
  const createHref = useCallback(({
    basepath,
    targetpath,
    optionValueChanges,
  }: {
    basepath?: string;
    targetpath: string;
    optionValueChanges?: Partial<OptionValues>;
  }) => {
    // Update option values with new values and create a new href object based on the new options
    return createHrefFromOptionValues(
      { ...optionValues, ...optionValueChanges } as OptionValues,
      targetpath,
      basepath
    )
  }, [optionValues]);

  // Navigate to a new path with existing or updated option values
  const navigate = ({ // Deprecated
    basepath,
    pathname,
    optionValueChanges,
  }: {
    basepath?: string;
    pathname: string;
    optionValueChanges?: Partial<OptionValues>;
  }) => {
    // Update option values with new values
    const updatedOptions: OptionValues = { ...optionValues, ...optionValueChanges };
    setOptionValues(updatedOptions);

    // Create a new href object based on the new options
    const href = createHrefFromOptionValues(updatedOptions, pathname, basepath)

    // Navigate to the new URL
    router.push(href);
  };

  const navigateToPage = ({
    pageId,
    optionValueChanges,
    pageSpecificOptionValueChanges,
  }: {
    pageId: string;
    optionValueChanges?: Partial<OptionValues>;
    pageSpecificOptionValueChanges?: Partial<OptionValues>;
  }) => {
    const pagePath = findPagePathById(navConfig, pageId);
    if (!pagePath) {
      console.error(`Page with id ${pageId} not found in nav config`);
      return;
    }

    // Update option values with new values
    const updatedOptions: OptionValues = { ...optionValues, ...optionValueChanges };
    setOptionValues(updatedOptions);

    // Update page-specific option values with new values
    const pageOptionValues = pageSpecificOptionValues[pageId] || {};
    const updatedPageSpecificOptionValues = { ...pageOptionValues, ...pageSpecificOptionValueChanges };
    setPageSpecificOptionValues({ ...pageSpecificOptionValues, [pageId]: updatedPageSpecificOptionValues });

    // Merge the updated options and page-specific option values
    const mergedOptionValues = { ...updatedOptions, ...updatedPageSpecificOptionValues };

    // Create a new href object based on the new options
    const href = createHrefFromOptionValues(mergedOptionValues, pagePath)

    // Navigate to the new URL
    router.push(href);
  }

  // Generate breadcrumbs based on the current path
  const generateBreadcrumbs = useCallback(() => {
    return recursivelyGenerateBreadcrumbsNew(navConfig.items, pathname, createHref);
  }, [createHref, pathname]);

  // Update breadcrumbs when the path changes
  useEffect(() => {
    setBreadcrumbs(generateBreadcrumbs());
  }, [generateBreadcrumbs]);

  return {
    pathname,
    breadcrumbs,
    createHref,
    navigate,
    navigateToPage,
    navConfig,
  };
};
