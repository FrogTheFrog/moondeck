import { logger } from "./logger";

export function makeEnvKeyValue(key: string, value: string | number): string {
  if (typeof value !== "string") {
    value = `${value}`;
  }

  if (/[' ]/.test(value)) {
    value = `'${value.replace(/'/g, "'\\''")}'`;
  }

  return `${key}=${value}`;
}

export function getEnvKeyValueString(envString: string, key: string): string | null {
  const keyRegexString = `${key}=`;
  const escapedValueRegexString = "('(?:'\\\\''|[^'])+')";

  // Check whether the key exists and is not part of the escaped value
  {
    const envStringWithoutValues = envString.replace(new RegExp(escapedValueRegexString, "g"), "");
    if (!envStringWithoutValues.includes(keyRegexString)) {
      return null;
    }
  }

  // Try to get the escaped value first and unescape it
  {
    const match = envString.match(new RegExp(`${keyRegexString}${escapedValueRegexString}`));
    if (match) {
      const reverseString = (value: string): string => { return value.split("").reverse().join(""); };
      const capturedGroup = match[match.length - 1];
      // Regex is written for backwards string to support nested escapes, because why not...?
      return reverseString(reverseString(capturedGroup).replace(/'(')\\'|([^']+)|./g, "$1$2"));
    }
  }

  const unescapedValueRegexString = "([^ ]+)";
  const match = envString.match(new RegExp(`${keyRegexString}${unescapedValueRegexString}`));
  if (match) {
    return match[match.length - 1];
  }

  logger.error(`Got ill-formed ENV string while trying to get key ${key}. ENV string: ${envString}`);
  return null;
}

export function getEnvKeyValueNumber(envString: string, key: string): number | null {
  const valueString = getEnvKeyValueString(envString, key);
  if (valueString === null) {
    return null;
  }

  const valueNumber = Number(valueString);
  if (Number.isNaN(valueNumber)) {
    logger.error(`Failed to convert ENV key ${key} value to a number. ENV string: ${envString}`);
    return null;
  }

  return valueNumber;
}
