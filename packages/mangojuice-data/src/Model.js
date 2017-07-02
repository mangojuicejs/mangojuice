export type Model<D> = {
  identifier: string,
  state: 'NotAsked' | 'Loading' | 'Failure' | 'Success' | 'Searching',
  errorMsg: string,
  rawData?: D,
  filteredIndexes: ?Array<number>,
  query: any,
  loadedOnce: boolean
};

export const createModel = (): Model<*> => ({
  identifier: '',
  state: 'NotAsked',
  errorMsg: '',
  query: '',
  filteredIndexes: null,
  loadedOnce: false
});
