import { Cmd, Task } from 'mangojuice-core';
import * as Tasks from './Tasks';
import * as Utils from './Utils';


export const Logic = {
  name: 'Data',

  config({ nest }, opts = {}) {
    return {
      meta: opts,
      children: opts.block
        ? { rawData: nest(null, opts.block.Logic) }
        : {}
    };
  },

  @Cmd.update
  TrackError(ctx, error) {
    return {
      errorMsg: (error && error.message) || 'Unknown error',
      state: 'Failure'
    };
  },

  @Cmd.update
  SetDataState(ctx, state) {
    return { state };
  },

  @Cmd.update
  SetIdentifier({ model }, identifier) {
    const loadedOnce = model.loadedOnce && model.identifier !== identifier;
    return { identifier, loadedOnce };
  },

  @Cmd.update
  SetRetreivedData(ctx, { data, indexes }) {
    return {
      rawData: data,
      filteredIndexes: indexes,
      loadedOnce: true
    };
  },

  @Cmd.batch
  RetreiveSuccess(ctx, result) {
    return [
      this.SetRetreivedData(result),
      this.SetDataState('Success')
    ];
  },

  @Cmd.execLatest
  RetreiveStart() {
    return Task.create(Tasks.retreiverWithSearching)
      .success(this.RetreiveSuccess())
      .fail(this.TrackError());
  },

  @Cmd.batch
  Retreive({ meta }, ...args) {
    return meta.retreiver && [
      this.SetDataState('Loading'),
      this.RetreiveStart(...args)
    ];
  },

  @Cmd.update
  Filter({ model }, target) {
    if (!model.rawData || !Array.isArray(model.rawData)) return;

    const targetIdx = model.rawData.indexOf(target);
    if (targetIdx >= 0) {
      const filterReducer = (acc, x) => {
        if (x !== targetIdx) {
          acc.push(x > targetIdx ? x - 1 : x);
        }
        return acc;
      };
      return {
        rawData: model.rawData.filter(x => x !== target),
        filteredIndexes:
          model.filteredIndexes &&
          model.filteredIndexes.reduce(filterReducer, [])
      };
    }
  },

  @Cmd.update
  SetFilteredIndexes(ctx, indexes) {
    return { filteredIndexes: indexes };
  },

  @Cmd.batch
  SearchSuccess({ model }, result) {
    if (Utils.isSearching(model)) {
      return [
        this.SetFilteredIndexes(result),
        this.SetDataState('Success')
      ];
    }
  },

  @Cmd.batch
  SearchFailed({ model }, error) {
    return Utils.isSearching(model) && this.TrackError(error);
  },

  @Cmd.execLatest
  SearchStart() {
    return Task.create(Tasks.searchWithResolving)
      .success(this.SearchSuccess())
      .fail(this.SearchFailed());
  },

  @Cmd.update
  SetSearchQuery(ctx, query) {
    return { query };
  },

  @Cmd.batch
  Search({ model }, e) {
    return [
      this.SetSearchQuery(e && e.target ? e.target.value : e),
      Utils.isReady(model) && this.SetDataState('Searching'),
      Utils.isReady(model) && this.SearchStart()
    ];
  },

  @Cmd.batch
  Cancel({ model }) {
    const result = [
      this.RetreiveStart.Cancel(),
      this.SearchStart.Cancel()
    ];
    if (!model.loadedOnce) {
      result.push(this.SetIdentifier(''));
      result.push(this.SetDataState('NotAsked'));
    } else if (!Utils.isReady(model)) {
      result.push(this.SetDataState('Success'));
    }
    return result;
  }
};
