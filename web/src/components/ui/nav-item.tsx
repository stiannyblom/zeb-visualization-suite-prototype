import React from "react"
import Link from "next/link"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/utils/design"

const NavTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<"h1">
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("transition-colors text-md text-muted-foreground", className)}
    {...props}
  />
))

NavTitle.displayName = "NavTitle"


const NavLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof Link> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : Link

  return (
    <Comp
      ref={ref}
      className={cn(
        "transition-colors text-md text-muted-foreground",
        "hover:text-foreground hover:border-4 hover:rounded-md hover:bg-slate-800",
        className)}
      {...props}
    />
  )
})
NavLink.displayName = "NavLink"

const SelectedNavLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof Link> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : Link

  return (
    <Comp
      ref={ref}
      className={cn(
        "text-foreground border-4 rounded-md bg-slate-800",
        className)}
      {...props}
    />
  )
})
SelectedNavLink.displayName = "SelectedNavLink"


export { NavTitle, NavLink, SelectedNavLink }

