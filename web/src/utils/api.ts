import * as dotenv from 'dotenv';
import { evaluate } from 'mathjs';

import { CalculatedDatumContext, Data, DataType, Datum, FetchDataContext, Field, Key, Model, Resolution, TimeSeriesDataType } from "@/types";

dotenv.config();

const HOST = `http://${process.env.API_HOST}:${process.env.API_PORT}`

export const fetchEnergySummaryDataFromAPI = async ({
  bucket,
  measured_data_measurement,
  modeled_data_measurement,
  fields,
  models,
  year,
  resolution,
  unit,
}: {
  bucket?: string;
  measured_data_measurement: string;
  modeled_data_measurement: string;
  fields: Field[];
  models: Model[];
  year: string;
  resolution: Resolution;
  unit: "kilowattHours";
}) => {
  const URL_BASE = HOST + "/api/energy-summary-data"

  const fetchParams = new URLSearchParams({
    measured_data_measurement,
    modeled_data_measurement,
    fields: fields.join(','),
    models: models.join(','),
    year,
    resolution,
    unit,
  })

  if (bucket) {
    fetchParams.set('bucket', bucket);
  }

  const url = `${URL_BASE}?${fetchParams.toString()}`;

  const res = (await fetch(url))
  if (!res.ok) {
    throw new Error(`Failed to fetch energy summary data from API: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Data>
}

export const fetchEnergySummaryMeasuredFieldDataFromAPI = async ({
  bucket,
  measurement,
  fields,
  year,
  resolution,
  unit = "kilowattHours",
}: {
  bucket?: string;
  measurement: string;
  fields: Field[];
  year: string;
  resolution: Resolution;
  unit?: "kilowattHours";
}) => {
  const URL_BASE = HOST + "/api/energy-summary-measured-field-data"

  const fetchParams = new URLSearchParams({
    measurement,
    fields: fields.join(','),
    year,
    resolution,
    unit,
  })

  if (bucket) {
    fetchParams.set('bucket', bucket);
  }

  const url = `${URL_BASE}?${fetchParams.toString()}`;

  const res = (await fetch(url))
  if (!res.ok) {
    throw new Error(`Failed to fetch measured energy summary data from API: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Data>
}

export const fetchEnergySummaryModeledFieldDataFromAPI = async ({
  bucket,
  measurement,
  fields,
  models,
  year,
  resolution,
  unit = "kilowattHours",
}: {
  bucket?: string;
  measurement: string;
  fields: Field[];
  models: Model[];
  year: string;
  resolution: Resolution;
  unit?: "kilowattHours";
}) => {
  const URL_BASE = HOST + "/api/energy-summary-modeled-field-data"

  const fetchParams = new URLSearchParams({
    measurement,
    fields: fields.join(','),
    models: models.join(','),
    year,
    resolution,
    unit,
  })

  if (bucket) {
    fetchParams.set('bucket', bucket);
  }

  const url = `${URL_BASE}?${fetchParams.toString()}`;

  const res = (await fetch(url))
  if (!res.ok) {
    throw new Error(`Failed to fetch modeled energy summary data from API: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Data>
}

const createMeasuredScope = (
  keyDatumMap: Map<string, Datum>,
  expressionsContextMap: Map<Key, CalculatedDatumContext>,
  shouldConvertNullsToZero: boolean
) => {
  const anyHasValue = Array.from(keyDatumMap.values()).some(datum => typeof datum.measured === 'number');
  // Skip if no values are present
  if (!anyHasValue) return new Map<Key, number>()

  const measuredScope = new Map<Key, number>();
  keyDatumMap.forEach((datum, key) => {
    let { measured } = datum;
    const isCalculatedKey = expressionsContextMap.has(key);
    if (measured === null && shouldConvertNullsToZero && !isCalculatedKey) {
      measured = 0;
    }
    if (measured !== null) {
      measuredScope.set(key, measured);
    }
  });
  return measuredScope;
}

const createModeledScope = (
  keyDatumMap: Map<string, Datum>,
  expressionsContextMap: Map<Key, CalculatedDatumContext>,
  shouldConvertNullsToZero: boolean
) => {
  const modeledScopeMap: Map<Key, Map<Model, number | null> | number> = new Map();
  keyDatumMap.forEach((datum, key) => {
    const modelsObj = datum.modeled;

    if (!modelsObj) {
      const isCalculatedKey = expressionsContextMap.has(key);
      if (shouldConvertNullsToZero && !isCalculatedKey) modeledScopeMap.set(key, 0);
      return;
    }

    const modelScopeMap = new Map();
    Object.entries(modelsObj).forEach(([model, value]) => {
      const finalValue = value === null && shouldConvertNullsToZero ? 0 : value;
      if (finalValue !== null) modelScopeMap.set(model, finalValue);
    });

    if (modelScopeMap.size > 0 || shouldConvertNullsToZero) modeledScopeMap.set(key, modelScopeMap);
  });
  return modeledScopeMap;
}

const evaluateAndUpdateMeasured = (
  data: TimeSeriesData,
  time: string,
  key: Key,
  calcExpression: string,
  scope: Map<Key, number>) => {
  // Skip if scope is empty
  if (scope.size === 0) return false

  try {
    const result = evaluate(calcExpression, Object.fromEntries(scope));
    data.upsertDatum(time, key, "measured", result);
    return true;
  } catch (e) {
    return false;
  }
}

const evaluateAndUpdateModeled = (
  data: TimeSeriesData,
  time: string,
  key: Key,
  calcExpression: string,
  scopeMap: Map<string, number | Map<string, number | null>>,
  models: Model[]
) => {
  const results: Record<Model, number> = {};
  let anyPassed = false;
  models.forEach(model => {
    const scope = new Map();
    scopeMap.forEach((value, modelKey) => {
      if (typeof value === 'number') {
        scope.set(modelKey, value);
      } else {
        const val = value.get(model);
        if (val !== undefined) scope.set(modelKey, val);
      }
    });

    try {
      const result: number = evaluate(calcExpression, Object.fromEntries(scope));
      results[model as Model] = result;
      anyPassed = true;
    } catch (e) { }
  });
  data.upsertDatum(time, key, "modeled", results);
  return anyPassed
}

const addCalculatedValues = (
  data: TimeSeriesData,
  expressionsContextMap: Map<Key, CalculatedDatumContext>,
  models?: Model[],
  maxIterations?: number,
) => {
  let expressionsLeft = new Set(expressionsContextMap.keys());
  let iterations = 0;
  while (expressionsLeft.size > 0 && iterations < (maxIterations ?? 10)) {
    const expressionsLeftCopy = new Set(expressionsLeft);
    expressionsLeft.forEach(key => {
      const { calcExpression, convertNullsToZero } = expressionsContextMap.get(key) as CalculatedDatumContext;
      const shouldConvertNullsToZero = convertNullsToZero ?? false;
      let anyPassed = false;

      data.getData().forEach((keyDatumMap, time) => {
        const measuredScope = createMeasuredScope(keyDatumMap, expressionsContextMap, shouldConvertNullsToZero);
        anyPassed = evaluateAndUpdateMeasured(data, time, key, calcExpression, measuredScope) || anyPassed;

        if (models && models.length > 0) {
          const modeledScopeMap = createModeledScope(keyDatumMap, expressionsContextMap, shouldConvertNullsToZero);
          evaluateAndUpdateModeled(data, time, key, calcExpression, modeledScopeMap, models);
        }

        if (anyPassed) {
          expressionsLeftCopy.delete(key);
        }
      })
    });

    expressionsLeft = expressionsLeftCopy;
    iterations++;
  }

  if (expressionsLeft.size > 0) {
    console.error(`Failed to evaluate expressions: ${Array.from(expressionsLeft).join(", ")}`);
  }
}

export class TimeSeriesData {
  private data: TimeSeriesDataType;

  constructor(data?: TimeSeriesDataType) {
    this.data = data ?? new Map<string, Map<Key, Datum>>();
  }

  // Update or insert data for a given time and key
  upsertDatum(time: string, key: Key, dataType: DataType, value: null | number | { [model: Model]: number | null }): void {
    let keyDatumMap = this.data.get(time) ?? new Map<Key, Datum>();
    let datum = keyDatumMap.get(key) ?? { measured: null, modeled: null };

    if (dataType === "measured" && typeof value === "number") {
      datum.measured = value;
    } else if (dataType === "modeled" && typeof value === "object") {
      datum.modeled = value;
    }

    keyDatumMap.set(key, datum);
    this.data.set(time, keyDatumMap);
  }

  // Retrieve data for a given time and key
  getDatum(time: string, key: Key): Datum | undefined {
    return this.data.get(time)?.get(key);
  }

  // Retrieve all data
  getData(): TimeSeriesDataType {
    return this.data;
  }
}

export const fetchEnergyTimeSeriesDataFromAPI = async ({ dataContext, year, models, resolution, convertToCO2 }: {
  dataContext: FetchDataContext;
  year: string;
  models?: Model[];
  resolution: Resolution;
  convertToCO2?: boolean;
}) => {
  // Output data
  const data = new TimeSeriesData();

  // Fetch (asyncronously) measured data for each measurement
  await Promise.all(Array.from(dataContext.direct.measured.entries()).map(async ([measurement, directDataCtxMap]) => {
    // Fetch field data from API
    const measureredFieldData = await fetchEnergySummaryMeasuredFieldDataFromAPI({
      measurement,
      fields: Array.from(directDataCtxMap.values()).map(ctx => ctx.field),
      year,
      resolution,
    });

    // Retrieve data for each datum context
    measureredFieldData.data.forEach(entry => {
      directDataCtxMap.forEach((datumCtx, key) => {
        const { field, carrier, negate } = datumCtx;

        let value = entry.fields[field]?.[carrier]?.measured;

        if (value === undefined) return;
        if (value !== null) {
          // Possibly transform values

          // Negate value if specified
          const shouldNegate = negate ?? false;
          value = shouldNegate ? -value : value;

          // Convert to CO2 if specified, with a given CO2 factor
          if (convertToCO2) {
            const co2Factor = datumCtx.co2Factor
            if (co2Factor !== undefined) {
              value = -value * co2Factor; // Negate value and multiply by CO2 factor
            }
          }
        }

        data.upsertDatum(entry.time, key, "measured", value);
      })
    })
  }))

  // Fetch (asyncronously) modeled data for each measurement
  if (models && dataContext.direct.modeled) {
    await Promise.all(Array.from(dataContext.direct.modeled.entries()).map(async ([measurement, directDataCtxMap]) => {
      // Fetch field data from API
      const modeledFieldData = await fetchEnergySummaryModeledFieldDataFromAPI({
        measurement,
        fields: Array.from(directDataCtxMap.values()).map(ctx => ctx.field),
        models,
        year,
        resolution,
      });

      // Retrieve data for each datum context
      modeledFieldData.data.forEach(entry => {
        directDataCtxMap.forEach((datumCtx, key) => {
          const { field, carrier, negate, co2Factor } = datumCtx;

          let modelsObj = entry.fields[field]?.[carrier]?.modeled;

          if (modelsObj === undefined) return;
          if (modelsObj !== null) {
            // Possibly transform values
            const newModelsObj: { [model: Model]: number | null } = {}
            for (let [model, value] of Object.entries(modelsObj)) {
              if (value === null) {
                newModelsObj[model] = null;
              } else {
                // Negate value if specified
                const shouldNegate = negate ?? false;
                value = shouldNegate ? -value : value;

                // Convert to CO2 if specified, with a given CO2 factor
                if (convertToCO2 && co2Factor !== undefined) {
                  value = -value * co2Factor; // Negate value and multiply by CO2 factor
                }

                // Add to new models object
                newModelsObj[model] = value;
              }
            }
            // Update models object
            modelsObj = newModelsObj;
          }

          data.upsertDatum(entry.time, key, "modeled", modelsObj);
        })
      })
    }))
  }

  // Calculate expressions for calculated keys
  if (dataContext.calculated) {
    addCalculatedValues(data, dataContext.calculated, models);
  }

  return data;
}
