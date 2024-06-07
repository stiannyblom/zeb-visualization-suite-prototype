import { OPTIONS_SITEWIDE } from "@/config/options";
import { FetchDataContext, SitewideOptionsKeys, SitewideOptions, OptionValues } from "@/types";

export class InvalidOptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOptionError";
  }
}

export class OptionsNotSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptionsNotSetError";
  }
}

export const validateSitewideOptions = (options: OptionValues) => {
  for (const key in options) {
    const option = OPTIONS_SITEWIDE[key];
    if (!option) {
      throw new InvalidOptionError(`Option ${key} not found in sitewide options`);
    }

    if (option.optionType === "select" && typeof options[key] === "string") {
      if (!option.optionItems.get(options[key] as string)) {
        throw new InvalidOptionError(`Option ${key} with value ${options[key]} not found in option items`);
      }
    }
  }
}

export const generateOptionPermutations = (options: SitewideOptions): OptionValues[] => {
  const categories = Object.keys(options) as SitewideOptionsKeys[];
  const permutations: OptionValues[] = [];

  const permute = (current: OptionValues, categoryIndex: number) => {
    if (categoryIndex === categories.length) {
      permutations.push(current);
      return;
    }

    const category: SitewideOptionsKeys = categories[categoryIndex];
    const categoryOption = options[category];

    if (categoryOption.disabled) {
      permute(current, categoryIndex + 1);
      return;
    }

    // Select option type
    for (const [optionKey, optionItem] of Object.entries(categoryOption.optionItems)) {
      if (optionItem.disabled) {
        continue;
      }

      permute({ ...current, [category]: optionKey }, categoryIndex + 1);
    }
  }

  permute({}, 0);
  return permutations;
}

export const getValidOptions = async (dataContext: FetchDataContext, sitewideOptionPermutations: OptionValues[], getDataFunc: Function) => {
  const validOptions: OptionValues[] = [];
  const invalidOptions: OptionValues[] = [];

  for (const permutation of sitewideOptionPermutations) {
    try {
      await getDataFunc({
        dataContext,
        options: permutation,
      });
      validOptions.push(permutation);
    } catch (error) {
      if (error instanceof InvalidOptionError) {
        invalidOptions.push(permutation);
      } else {
        console.error(error);
        invalidOptions.push(permutation);
      }
    }
  }

  return { validOptions, invalidOptions };
}
