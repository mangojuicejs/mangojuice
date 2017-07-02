export function searchWithResolving(ctx, newData) {
  const data = newData || ctx.model.rawData;
  const searcher = ctx.meta.searcher || (() => null);
  const doSearch = () => this.call(searcher, ctx, data);

  if (ctx.meta.block && ctx.meta.block.resolver) {
    const resolver = ctx.meta.block.resolver;
    return Promise.all(data.map(m => resolver(m))).then(doSearch);
  }
  return doSearch();
}

export function retreiverWithSearching(ctx, ...args) {
  return this.call(ctx.meta.retreiver, ctx, ...args)
    .then(data => {
      return this.call(searchWithResolving, ctx, data)
        .then(indexes => {
          return { data, indexes };
        });
    });
}
