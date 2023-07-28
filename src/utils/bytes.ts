/*!
 * bytes
 * MIT Licensed
 */

import { isArrayBuffer, isBuffer, isString } from "lodash";

interface BytesOptions {
  case?: string;
  decimalPlaces?: number;
  fixedDecimals?: boolean;
  thousandsSeparator?: string;
  unitSeparator?: string;
}

interface Map {
  [key: string]: number;
  b: number;
  kb: number;
  mb: number;
  gb: number;
  tb: number;
  pb: number;
}

const formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;
const formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;

const map: Map = {
  b: 1,
  kb: 1 << 10,
  mb: 1 << 20,
  gb: 1 << 30,
  tb: Math.pow(1024, 4),
  pb: Math.pow(1024, 5),
};

const parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

/**
 * Convert the given value in bytes into a string or parse to string to an integer in bytes.
 *
 * @param value - The value to convert or parse.
 * @param options - Optional bytes options.
 * @returns The converted string or parsed integer, or null if conversion/parsing failed.
 */
function bytes(
  value: string | number,
  options?: BytesOptions
): string | number | null {
  if (typeof value === "string") {
    return parse(value);
  }

  if (typeof value === "number") {
    return format(value, options);
  }

  return null;
}

export function getByteSize(value) {
  if (isString(value) || typeof value === "number") {
    return bytes(value);
  } else if (isArrayBuffer(value) || isBuffer(value)) {
    return bytes(value.byteLength);
  } else {
    return bytes(JSON.stringify(value).toString());
  }
}

/**
 * Format the given value in bytes into a string.
 *
 * If the value is negative, it is kept as such. If it is a float,
 * it is rounded.
 *
 * @param value - The value to format.
 * @param options - Optional formatting options.
 * @returns The formatted string, or null if formatting failed.
 */
function format(value: number, options?: BytesOptions): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const mag = Math.abs(value);
  const thousandsSeparator = (options && options.thousandsSeparator) || "";
  const unitSeparator = (options && options.unitSeparator) || "";
  const decimalPlaces =
    options?.decimalPlaces !== undefined ? options.decimalPlaces : 2;
  const fixedDecimals = Boolean(options?.fixedDecimals);
  let unit = (options && options.case && options.case.toLowerCase()) || "";

  if (!unit || !map[unit.toLowerCase()]) {
    if (mag >= map.pb) {
      unit = "PB";
    } else if (mag >= map.tb) {
      unit = "TB";
    } else if (mag >= map.gb) {
      unit = "GB";
    } else if (mag >= map.mb) {
      unit = "MB";
    } else if (mag >= map.kb) {
      unit = "KB";
    } else {
      unit = "B";
    }
  }

  const val = value / map[unit.toLowerCase()];
  let str = val.toFixed(decimalPlaces);

  if (!fixedDecimals) {
    str = str.replace(formatDecimalsRegExp, "$1");
  }

  if (thousandsSeparator) {
    str = str
      .split(".")
      .map((s, i) =>
        i === 0 ? s.replace(formatThousandsRegExp, thousandsSeparator) : s
      )
      .join(".");
  }

  return str + unitSeparator + unit;
}

/**
 * Parse the string value into an integer in bytes.
 *
 * If no unit is given, it is assumed the value is in bytes.
 *
 * @param val - The value to parse.
 * @returns The parsed integer, or null if parsing failed.
 */
function parse(val: number | string): number | null {
  if (typeof val === "number" && !isNaN(val)) {
    return val;
  }

  if (typeof val !== "string") {
    return null;
  }

  const results = parseRegExp.exec(val);
  let floatValue: number;
  let unit = "b";

  if (!results) {
    floatValue = parseInt(val, 10);
    unit = "b";
  } else {
    floatValue = parseFloat(results[1]);
    unit = results[4].toLowerCase();
  }

  if (isNaN(floatValue)) {
    return null;
  }

  return Math.floor(map[unit] * floatValue);
}

export default bytes;
export { format, parse };
