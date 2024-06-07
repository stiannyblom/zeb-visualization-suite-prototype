"use client"

import React from "react";
import Link from "next/link";

import { SideNav } from "@/components/sidebar/side-nav";
import { cn } from "@/utils/design";
import { useNav } from "@/hooks/useNav";
import { ToggleButton } from "@/components/buttons/toggle-button";
import { useNavbar } from "@/context/NavbarContext";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { isOpen, setIsOpen } = useNavbar();
  const { createHref, navConfig } = useNav();

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };
  return (
    <nav
      className={cn(
        `h-screen bg-background z-50 flex flex-col shrink-0`,
        isOpen ? "border-r" : "w-0",
        className
      )}
    >
      <div className="flex justify-between p-4">
        {isOpen && navConfig.href && (
          <Link
            href={createHref({ targetpath: navConfig.href })}
            className="font-bold text-lg mr-2">
            {navConfig.title}
          </Link>
        )}
        {isOpen && !navConfig.href && (
          <h1
            className="font-bold text-lg mr-2">
            {navConfig.title}
          </h1>
        )}
        {isOpen && <ToggleButton
          className={cn(
            "cursor-pointer h-6 w-6",
            !isOpen && "rotate-180",
          )}
          onClick={handleToggle}
        />}
      </div>
      {isOpen && (
        <div className="space-y-4 py-4 p-4">
          <SideNav />
        </div>
      )}
    </nav>
  );
}
