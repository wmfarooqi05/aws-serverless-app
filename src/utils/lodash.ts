export const chunk = (array: any[], size: number) => {
  if (!Array.isArray(array)) {
    throw new TypeError('The "array" parameter must be an array.');
  }

  if (typeof size !== "number" || size <= 0) {
    throw new TypeError('The "size" parameter must be a positive number.');
  }

  const chunkedArray = [];
  let index = 0;
  while (index < array.length) {
    chunkedArray.push(array.slice(index, index + size));
    index += size;
  }
  return chunkedArray;
};
