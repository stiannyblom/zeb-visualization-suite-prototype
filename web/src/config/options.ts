import { PageSpecificOptions, SitewideOptions } from "@/types";

export const OPTIONS_SITEWIDE: SitewideOptions = {
  year: {
    optionType: "select",
    label: "Year",
    optionItems: new Map([
      ["2024", { label: "2024" }],
      ["2023", { label: "2023" }],
      // ["2022", { label: "2022" }], // TODO: Uncomment this line when the data is corrected
    ]),
    default: new Date().getFullYear().toString() // Default to the current year
  },
  month: {
    optionType: "select",
    label: "Month",
    optionItems: new Map([
      ["all", { label: "All months" }],
      ["01", { label: "January" }],
      ["02", { label: "February" }],
      ["03", { label: "March" }],
      ["04", { label: "April" }],
      ["05", { label: "May" }],
      ["06", { label: "June" }],
      ["07", { label: "July" }],
      ["08", { label: "August" }],
      ["09", { label: "September" }],
      ["10", { label: "October" }],
      ["11", { label: "November" }],
      ["12", { label: "December" }],
    ]),
    default: "all"
  },
  measuringPoint: {
    optionType: "select",
    label: "Measuring point",
    infoText: "Select the measuring point to display energy usage as.\n • 'Gross energy demand': The energy required to cover the building's energy demand, taking into account any heat losses during accumulation (e.g. hot water tanks) or distribution (e.g. pipes) \n • 'Delivered energy': The gross energy demand of the building, while also taking into account the energy conversion efficiency (e.g. the high efficiency of heat pumps reduces the required delivered energy)",
    optionItems: new Map([
      ["demand-gross", { label: "Gross energy demand" }],
      ["delivered", { label: "Delivered energy" }],
    ]),
    default: "delivered"
  },
  model: {
    optionType: "select",
    label: "Simulation model",
    infoText: "Select a simulation model to compare the measured data with.\n • 'Realistic': This model uses data estimated for the building’s actual specifications and conditions \n • 'TEK17': A baseline model using minimal required energy-efficiency measures under TEK17 standards",
    optionItems: new Map([
      ["Reell", { label: "Realistic" }],
      ["TEK17", { label: "TEK17" }],
      // ["ZEBCOM", { label: "ZEB-COM" }]
    ]),
    default: "Reell"
  }
};

export const OPTIONS_PAGE_SPECIFIC: PageSpecificOptions = {
  "energy-in-out": {
    showElProductionDetails: {
      optionType: "toggle",
      default: false,
      label: "Show el. production details",
    },
  },
  "accumulated-balance": {
    showAsCO2: {
      optionType: "toggle",
      default: false,
      label: "Show as CO2 eq.",
      infoText: "Toggle between showing energy balance vs. emissions balance (as CO₂ equivalent emissions).\n\nCalculated based on average European grid emissions.\nCO₂ factors used:\n • For electrical energy: 0.132 kg CO₂ eq. / kWh \n • For thermal energy: 0.198 kg CO₂ eq. / kWh",
    },
  },
};
