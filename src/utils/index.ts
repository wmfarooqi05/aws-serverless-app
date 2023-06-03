export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const xnorGate = (a, b) => {
  if ((a && b) || (!a && !b)) {
    return true;
  } else {
    return false;
  }
};
