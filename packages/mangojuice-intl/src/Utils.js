export const formatString = (format: string, args: Array<any>) => {
  return format.replace(/{(\d+)}/g, (match, num) => {
    return typeof args[num] != 'undefined' ? args[num] : match;
  });
};

export const formatMessage = (
  model: Model,
  id: string,
  ...args: Array<any>
): string => {
  const format = model.messages[id];
  return format ? formatString(format, args) : id;
};
