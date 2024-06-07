
"use client";

import React from "react";

import { useNav } from "@/hooks/useNav";
import { NavLink, NavTitle, SelectedNavLink } from "@/components/ui/nav-item";
import { cn } from "@/utils/design";
import { NavItemWithChildren } from "@/types";
import { buildPath } from "@/utils/router";

const NavItem = ({ href, pathname, className, children }: {
  href?: string,
  pathname: string,
  className?: string,
  children: React.ReactNode;
}) => {
  if (!href) {
    return <NavTitle className={cn("font-bold", className)}>{children}</NavTitle>
  }

  let isCurrentPath = pathname === buildPath(undefined, href);
  if (isCurrentPath) {
    return (
      <SelectedNavLink
        href={href}
        className={className}
      >
        {children}
      </SelectedNavLink>
    )
  }
  return (
    <NavLink
      href={href}
      className={className}
    >
      {children}
    </NavLink>
  )
}


export function SideNav() {
  const {
    pathname,
    createHref,
    navConfig,
  } = useNav();

  // Recursively render the navigation items
  const renderNavItems = (items: NavItemWithChildren[], level?: number) => {
    if (!items) return null;
    if (level === undefined) level = 0;

    return items.map((item, index) => {
      const parentHref = item.href ? createHref({ targetpath: item.href }) : undefined;
      const children = item.items.map((subItem: NavItemWithChildren) => {
        const childHref = subItem.href ? createHref({ basepath: parentHref, targetpath: subItem.href, }) : undefined;
        return {
          ...subItem,
          href: childHref,
        }
      })

      return (
        <div key={index} className="flex flex-col space-y-3">
          {/* Render parent */}
          <NavItem
            href={parentHref}
            pathname={pathname}
            className={level === 0 ? "font-bold" : ""}
          >
            {item.title}
          </NavItem>
          {/* Render children */}
          <div className="pl-4">
            {renderNavItems(children, level + 1)}
          </div>
        </div>
      )
    });
  };

  return (
    <div className="flex flex-col space-y-2">
      {renderNavItems(navConfig.items)}
    </div>
  );
}
