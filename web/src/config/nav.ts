import { NavConfig } from "@/types";

export const navConfig: NavConfig = {
  id: "root",
  title: "ZEB Lab",
  defaultPath: "/energy-balance",
  href: "/",
  items: [
    {
      id: "energy-balance",
      title: "Energy balance",
      href: "/energy-balance",
      items: [
        {
          id: "energy-in-out",
          title: "Energy in and out",
          href: "/energy-in-out",
          items: [],
        },
      ],
    },
    {
      id: "accumulated-balance",
      title: "Accumulated energy and emissions balance",
      infoText: "The balance is calculated as the difference between delivered energy and energy demand.\nIt can be converted between energy and CO₂ equivalent emissions.",
      href: "/accumulated-balance",
      items: [],
    },
  ],
}
