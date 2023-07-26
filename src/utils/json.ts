export const isValidJSON = (str: string): boolean => {
  try {
    JSON.stringify(str);
    return true;
  } catch (e) {
    return false;
  }
};
