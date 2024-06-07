import { Breadcrumb, Key, KeyInfoMap, NavConfig, NavItemWithChildren, OptionValues } from "@/types";

export const buildPath = (basePath?: string, targetPath?: string) => {
  const sanitizePath = (path: string) => path.replace(/^\/|\/$/g, '').split('?')[0];

  const sanitizedBasePath = basePath ? sanitizePath(basePath) : '';
  const sanitizedTargetPath = targetPath ? sanitizePath(targetPath) : ''

  if (!sanitizedBasePath) {
    return '/' + sanitizedTargetPath;
  } else {
    return `/${sanitizedBasePath}/${sanitizedTargetPath}`;
  }
}

export const findPagePathById = (navConfig: NavConfig, pageId: string): string | undefined => {
  // Recursively search for the pageId and build the path
  const recursiveSearch = (items: NavItemWithChildren[], currentPath: string = ''): string | undefined => {
    for (const item of items) {
      const fullPath = buildPath(currentPath, item.href); // Construct the full path
      if (item.id === pageId) {
        return fullPath;  // Return the full path if the current item is the target
      }
      if (item.items.length) {
        const path = recursiveSearch(item.items, fullPath); // Recursively search in sub-items
        if (path) return path;  // Return the path if found in sub-items
      }
    }
    return undefined;  // Return undefined if the pageId is not found
  };

  return recursiveSearch(navConfig.items);
};

export const findPageIdByPath = (navConfig: NavConfig, pathname: string): string | undefined => {
  // Recursively search for the pathname
  const recursiveSearch = (items: NavItemWithChildren[], currentPath: string = ''): string | undefined => {
    for (const item of items) {
      if (!item.href && item.items) {
        // If the item has no href but has children, recursively search its children
        return recursiveSearch(item.items, currentPath);
      } else if (!item.href) {
        continue; // Skip items without href
      }

      // Build the full path
      const fullPath = buildPath(currentPath, item.href); // Construct the full path
      if (fullPath === pathname) {
        return item.id; // Return the id if the full path matches the pathname
      }

      if (item.items.length) {
        const foundId = recursiveSearch(item.items, fullPath); // Recursively search in sub-items
        if (foundId) return foundId; // Return the id if found in sub-items
      }
    }
    return undefined; // Return undefined if the pathname is not found
  };

  return recursiveSearch(navConfig.items);
};

export const findNavItemById = (navItems: NavItemWithChildren[], pageId: string): NavItemWithChildren | undefined => {
  for (const item of navItems) {
    if (item.id === pageId) {
      return item;
    }

    if (item.items.length) {
      const foundItem = findNavItemById(item.items, pageId);
      if (foundItem) return foundItem;
    }
  }
  return undefined;
}

export const createHrefWithSearchParams = ({ basePath, targetPath, searchParams }: {
  basePath?: string;
  targetPath: string;
  searchParams?: URLSearchParams;
}) => {
  let href = buildPath(basePath, targetPath);
  if (searchParams && searchParams.toString()) {
    const searchParamsString = searchParams.toString();
    href += `?${searchParamsString}`;
  }

  return href
}

export const createHrefFromOptionValues = (optionValues: OptionValues, targetPath: string, basePath?: string) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(optionValues)) {
    if (value !== undefined) {
      if (typeof value === 'boolean') {
        params.set(key, value.toString());
      } else {
        params.set(key, value);
      }
    }
  }

  return createHrefWithSearchParams({ basePath: basePath, targetPath: targetPath, searchParams: params });
}

// Get the path from the keyInfoMap if it exists
export const getPathFromKeyInfoMap = (keyInfoMap: KeyInfoMap, key: Key) => keyInfoMap.get(key)?.path;

export const recursivelyGenerateBreadcrumbsNew = (
  navItems: NavItemWithChildren[],
  path: string,
  createHref: (params: { basepath: string, targetpath: string }) => string,
  basepath: string = '',
  accumulator: Breadcrumb[] = []
): Breadcrumb[] => {
  for (const item of navItems) {
    if (!item.href && item.items) {
      // If the item has no href but has children, recursively search its children
      return recursivelyGenerateBreadcrumbsNew(item.items, path, createHref, basepath, accumulator);
    }

    const href = createHref({ basepath, targetpath: item.href || '' });
    const fullPath = buildPath(basepath, item.href || '');
    if (path === item.href || path === fullPath) {
      // If the path matches the item's href, add it to the accumulator and end the search
      accumulator.push({ title: item.title, href: href });
      return accumulator;
    }

    if (path.startsWith(item.href || '') && item.items && item.items.length > 0) {
      // If the path starts with the item's href, recursively search its children
      accumulator.push({ title: item.title, href: href });
      return recursivelyGenerateBreadcrumbsNew(item.items, path, createHref, item.href || '', accumulator);
    }
  }

  return accumulator;
};
