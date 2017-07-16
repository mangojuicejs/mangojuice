let currContext = null;

export const setContext = (nextContext) =>
  currContext = nextContext;

export const getContext = () =>
  currContext;

export const runInContext = (func, props) => {
  let oldContext = currContext;
  currContext = props;
  try {
    return func(props);
  } finally {
    currContext = oldContext;
  }
};
