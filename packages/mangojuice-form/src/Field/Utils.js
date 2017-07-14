import { Utils } from 'mangojuice-core';


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

export const resolve = (val, ...args) => {
  if (Utils.is.func(val)) {
    return val(...args);
  }
  return val;
};
