// @flow
import type { LogicFn, CmdsObj } from "../types";
import { Cmd, Task } from "../";

// Model
export type Model<D> = {
  identifier: string,
  state: "NotAsked" | "Loading" | "Failure" | "Success" | "Searching",
  errorMsg: string,
  rawData?: D,
  filteredIndexes: ?Array<number>,
  query: any,
  loadedOnce: boolean
};

export const createModel = (): Model<*> => ({
  identifier: "",
  state: "NotAsked",
  errorMsg: "",
  query: "",
  filteredIndexes: null,
  loadedOnce: false
});

// Logic
export const Logic = {
  name: "Data",

  config({ nest }, opts = {}) {
    return {
      meta: opts,
      children: !opts.block
        ? {}
        : {
            rawData: nest(null, opts.block.Logic)
          }
    };
  },

  @Cmd.update
  TrackError(ctx, error) {
    return {
      errorMsg: (error && error.message) || "Unknown error",
      state: "Failure"
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
    return [this.SetRetreivedData(result), this.SetDataState("Success")];
  },

  @Cmd.execLatest
  RetreiveStart() {
    return Task.create(retreiverWithSearching)
      .success(this.RetreiveSuccess())
      .fail(this.TrackError());
  },

  @Cmd.batch
  Retreive({ meta }, ...args) {
    if (meta.retreiver) {
      return [this.SetDataState("Loading"), this.RetreiveStart(...args)];
    }
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
    if (isSearching(model)) {
      return [this.SetFilteredIndexes(result), this.SetDataState("Success")];
    }
  },

  @Cmd.batch
  SearchFailed({ model }, error) {
    return isSearching(model) && this.TrackError(error);
  },

  @Cmd.execLatest
  SearchStart() {
    return Task.create(searchWithResolving)
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
      isReady(model) && this.SetDataState("Searching"),
      isReady(model) && this.SearchStart()
    ];
  },

  @Cmd.batch
  Cancel({ model }) {
    const result = [this.RetreiveStart.Cancel(), this.SearchStart.Cancel()];
    if (!model.loadedOnce) {
      result.push(this.SetIdentifier(""));
      result.push(this.SetDataState("NotAsked"));
    } else if (!isReady(model)) {
      result.push(this.SetDataState("Success"));
    }
    return result;
  }
};

// Internal tasks
async function searchWithResolving(ctx, newData) {
  const data = newData || ctx.model.rawData;
  const searcher = ctx.meta.searcher || (() => null);

  if (ctx.meta.block && ctx.meta.block.resolver) {
    const resolver = ctx.meta.block.resolver;
    await Promise.all(data.map(m => resolver(m)));
  }
  return await this.call(searcher, ctx, data);
}

async function retreiverWithSearching(ctx, ...args) {
  const data = await this.call(ctx.meta.retreiver, ctx, ...args);
  const indexes = await this.call(searchWithResolving, ctx, data);
  return { data, indexes };
}

// Utils
export const isDifferent = <T>(model: Model<T>, idnt: string) =>
  model.identifier !== idnt;

export const isNotAsked = <T>(model: Model<T>) => model.state === "NotAsked";

export const isSearching = <T>(model: Model<T>) => model.state === "Searching";

export const isReady = <T>(model: Model<T>) =>
  model.state === "Success" || isSearching(model);

export const isLoading = <T>(model: Model<T>) =>
  model.state === "Loading" || isNotAsked(model);

export const isError = <T>(model: Model<T>) => model.state === "Failure";

export const whenError = <T>(model: Model<T>, fn: (err: string) => any) =>
  isError(model) && fn(model.errorMsg);

export const whenLoading = <T>(model: Model<T>, fn: () => any) =>
  isLoading(model) && fn();

export const whenReady = <T>(model: Model<T>, fn: (res: T) => any) => {
  if (!isReady(model) || !model.rawData) {
    return;
  } else if (!model.filteredIndexes) {
    return fn(model.rawData);
  } else if (Array.isArray(model.rawData)) {
    const arrRes = (model.rawData: Array<T>);
    return fn(model.filteredIndexes.map(i => arrRes[i]));
  }
};
