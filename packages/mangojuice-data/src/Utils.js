export const isDifferent = (model, idnt) =>
  model.identifier !== idnt;

export const isNotAsked = (model) => model.state === 'NotAsked';

export const isSearching = (model) => model.state === 'Searching';

export const isReady = (model) =>
  model.state === 'Success' || isSearching(model);

export const isLoading = (model) =>
  model.state === 'Loading' || isNotAsked(model);

export const isError = (model) => model.state === 'Failure';

export const whenError = (model, fn) =>
  isError(model) && fn(model.errorMsg);

export const whenLoading = (model, fn) =>
  isLoading(model) && fn();

export const whenReady = (model, fn) => {
  if (!isReady(model) || !model.rawData) {
    return;
  } else if (!model.filteredIndexes) {
    return fn(model.rawData);
  } else if (Array.isArray(model.rawData)) {
    const arrRes = (model.rawData: Array<T>);
    return fn(model.filteredIndexes.map(i => arrRes[i]));
  }
};
