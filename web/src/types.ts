import { BarDatum } from "@nivo/bar";


// Navigation
export interface NavItem {
  id: string;
  title: string
  href?: string
  label?: string
  infoText?: string
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[]
}

export interface MainNavItem extends NavItemWithChildren { }

export interface NavConfig {
  id: string;
  title: string;
  defaultPath: string;
  items: MainNavItem[];
  href?: string;
}

export type Breadcrumb = { title: string, href: string }


// Options
interface GenericOption<T> {
  label: string;
  default: T;
  disabled?: boolean;
  infoText?: string;
}

// Option: Select
type SelectOptionItem = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  infoText?: string;
};
type SelectOptionValue = string;
export interface SelectOption extends GenericOption<SelectOptionValue> {
  optionType: "select";
  optionItems: Map<SelectOptionValue, SelectOptionItem>;
}

// Option: Toggle
type ToggleOptionValue = boolean;
export interface ToggleOption extends GenericOption<ToggleOptionValue> {
  optionType: "toggle";
}

export type OptionKey = string;
export type OptionType = SelectOption | ToggleOption
export type Options = Record<OptionKey, OptionType>;
export type OptionValues = {
  [key: OptionKey]: Options[OptionKey]['default'] | undefined;
};

export type SitewideOptions = Record<OptionKey, SelectOption>;
export type SitewideOptionsKeys = keyof SitewideOptions;

export type PageSpecificOptions = Record<string,
  Record<OptionKey, OptionType>
>;
export type PageSpecificOptionValues = {
  [page: string]: OptionValues
};


// Data response from API
export type Resolution = "hourly" | "daily" | "weekly" | "monthly" | "yearly"

export type Field = string;
export type Model = string;
export type Key = Field | Model | "string";
export type Carrier = "Electric" | "Thermal" | "Unknown";

export type Datum = {
  measured: number | null;
  modeled: Record<Model, number | null> | null;
};

export type CarrierDataEntry = Record<Carrier, Datum>;

export interface DataEntry {
  time: string;
  fields: Record<Field, CarrierDataEntry>;
}

interface Metadata {
  measurements: string[];
  fields: Field[];
  models: Model[];
  unit: string;
  year: number;
}

export interface Data {
  data: DataEntry[];
  metadata: Metadata;
}

// Others
export type KeyColors = Map<Key, string>;

export type SVGElementCustomClickEvent = (event: React.MouseEvent<SVGElement, MouseEvent>, key: Key, time: string) => void;


// Specific to the various charts
// Bar chart
export interface BarChartKeyInfo {
  label: string;
  color?: string;
  path?: string;
  lineType?: "full" | "dashed"; // Specific to the bar chart
}

export interface KeyInfoContext extends BarChartKeyInfo {
  dataType: "measured" | "modeled";
  fields: Field[];
  carrier: "Electric" | "Thermal" | "Unknown";
}

export interface DataSourceContext {
  measuredDataMeasurement: string;
  modeledDataMeasurement: string;
  keyInfoMap: Map<Key, KeyInfoContext>;
  negate?: boolean;
}

export type KeyInfoMap = Map<Key, BarChartKeyInfo>;

export interface BarTimeDatum extends BarDatum {
  time: string;
}

// General
export interface DatumContext {
  readonly carrier: "Electric" | "Thermal" | "Unknown";
  readonly field: Field;
  readonly negate?: boolean;
  readonly co2Factor?: number;
}

export type DataType = "measured" | "modeled";
export type Measurement = string

export interface DirectDataContext {
  readonly measured: Map<Measurement, Map<Key, DatumContext>>;
  readonly modeled?: Map<Measurement, Map<Key, DatumContext>>;
}

export interface CalculatedDatumContext {
  readonly calcExpression: string;
  readonly convertNullsToZero?: boolean; // Default is false, returns null if any of the values are null
};

export interface FetchDataContext {
  readonly direct: DirectDataContext;
  readonly calculated: Map<Key, CalculatedDatumContext>
}

export type SingleValueDatum = {
  measured: number | null;
  modeled: number | null;
};

export type TimeSeriesDataType = Map<string, Map<Key, Datum>>;
export type TimeSeriesSingleValueDataType = Map<string, Map<Key, SingleValueDatum>>;

export type NavigateToPageActionInfo = {
  readonly actionType: "navigateToPage";
  readonly pageId: string; // Page id defined in the nav config
}

export type ToggleOptionValueActionInfo = {
  readonly actionType: "toggleOptionValue";
  readonly optionKey: OptionKey; // Option key defined in the options config
}

export type ActionInfo = NavigateToPageActionInfo | ToggleOptionValueActionInfo;


// Sankey chart
type SankeyNodeContext = {
  readonly label: string;
  readonly color?: string;
  readonly onClickInfo?: ActionInfo;
}

type SankeyLinkContext = {
  readonly source: Key;
  readonly target: Key;
  readonly valueFromDatum: string;
  readonly hideIfSmall?: boolean;
  readonly showIfOptionValues?: OptionValues; // All option values must match
}

export interface SankeyContext {
  readonly nodes: Map<Key, SankeyNodeContext>
  readonly links: Map<Key, SankeyLinkContext>
}

export interface SankeyNode {
  id: Key;
  color: string;
  onClickInfo?: ActionInfo;
}

export interface SankeyLink {
  source: Key;
  target: Key;
  value: number;
  onClickInfo?: ActionInfo;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  modeledDataLinks?: SankeyLink[];
}

// Line chart (accumulated)
interface LineContext {
  readonly id: Key
  readonly label: string;
  readonly valueFromDatum: {
    readonly positiveContribution: Key;
    readonly negativeContribution: Key;
  }
  readonly color: string;
  readonly dynamicLineColor?: boolean
  readonly lineStyle: "solid" | "dashed";
  readonly pointType: "none" | "circle" | "triangle";
}

export interface LinesContext {
  readonly measured: LineContext
  readonly modeled: LineContext
}

export interface LineSerieDatum {
  x: string,
  y: {
    positiveContribution: number | null;
    negativeContribution: number | null;
  }
}

export interface LineSerie {
  dataType: DataType;
  id: string;
  data: LineSerieDatum[];
  label: string;
  color: LineContext["color"];
  dynamicLineColor?: LineContext["dynamicLineColor"];
  lineStyle: LineContext["lineStyle"];
  pointType: LineContext["pointType"];
}

export interface Serie {
  id: string;
  data: { x: string, y: number | null }[];
  color: string;
}
