export const valueHead = (model, defaultVal = '') => {
  return Array.isArray(model.value)
    ? model.value[model.value.length - 1] || defaultVal
    : model.value;
};

export const valueTail = (model) => {
  return Array.isArray(model.value)
    ? model.value.slice(0, model.value.length - 1)
    : [];
};
