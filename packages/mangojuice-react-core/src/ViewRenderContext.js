let currContext = null;

export const setContext = (nextContext) =>
  currContext = nextContext;

export const getContext = () =>
  currContext;

export function contextInjector(context, orgRender, args) {
  const oldContext = getContext();
  setContext(context);
  try {
    return orgRender.apply(this, args);
  } finally {
    setContext(oldContext);
  }
}
