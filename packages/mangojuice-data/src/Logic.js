import { Cmd, Task } from 'mangojuice-core';
import * as Tasks from './Tasks';
import * as Utils from './Utils';


export const Logic = {
  name: 'Data',

  config(meta = {}) {
    return { meta };
  },

  children() {
    const { nest, meta } = this;
    return meta.block
      ? { rawData: nest(meta.block.Logic) }
      : {};
  },

  @Cmd.update
  TrackError(error) {
    return {
      errorMsg: (error && error.message) || 'Unknown error',
      state: 'Failure'
    };
  },

  @Cmd.update
  SetDataState(state) {
    return { state };
  },

  @Cmd.update
  SetIdentifier(identifier) {
    const loadedOnce = this.model.loadedOnce && this.model.identifier !== identifier;
    return { identifier, loadedOnce };
  },

  @Cmd.update
  SetRetreivedData({ data, indexes }) {
    return {
      rawData: data,
      filteredIndexes: indexes,
      loadedOnce: true
    };
  },

  @Cmd.batch
  RetreiveSuccess(result) {
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
  Retreive(...args) {
    return this.meta.retreiver && [
      this.SetDataState('Loading'),
      this.RetreiveStart(...args)
    ];
  },

  @Cmd.update
  Filter(target) {
    if (!this.model.rawData || !Array.isArray(this.model.rawData)) return;

    const targetIdx = this.model.rawData.indexOf(target);
    if (targetIdx >= 0) {
      const filterReducer = (acc, x) => {
        if (x !== targetIdx) {
          acc.push(x > targetIdx ? x - 1 : x);
        }
        return acc;
      };
      return {
        rawData: this.model.rawData.filter(x => x !== target),
        filteredIndexes:
          this.model.filteredIndexes &&
          this.model.filteredIndexes.reduce(filterReducer, [])
      };
    }
  },

  @Cmd.update
  SetFilteredIndexes(indexes) {
    return { filteredIndexes: indexes };
  },

  @Cmd.batch
  SearchSuccess(result) {
    if (Utils.isSearching(this.model)) {
      return [
        this.SetFilteredIndexes(result),
        this.SetDataState('Success')
      ];
    }
  },

  @Cmd.batch
  SearchFailed(error) {
    return Utils.isSearching(this.model) && this.TrackError(error);
  },

  @Cmd.execLatest
  SearchStart() {
    return Task.create(Tasks.searchWithResolving)
      .success(this.SearchSuccess())
      .fail(this.SearchFailed());
  },

  @Cmd.update
  SetSearchQuery(query) {
    return { query };
  },

  @Cmd.batch
  Search(e) {
    return [
      this.SetSearchQuery(e && e.target ? e.target.value : e),
      Utils.isReady(this.model) && this.SetDataState('Searching'),
      Utils.isReady(this.model) && this.SearchStart()
    ];
  },

  @Cmd.batch
  Cancel() {
    const result = [
      this.RetreiveStart.Cancel(),
      this.SearchStart.Cancel()
    ];
    if (!this.model.loadedOnce) {
      result.push(this.SetIdentifier(''));
      result.push(this.SetDataState('NotAsked'));
    } else if (!Utils.isReady(this.model)) {
      result.push(this.SetDataState('Success'));
    }
    return result;
  }
};
