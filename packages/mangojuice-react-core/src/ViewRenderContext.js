let currContext = null;

export const runInContext = (func, props) => {
  let oldContext = currContext;
  currContext = props;
  try {
    return func(props);
  } finally {
    currContext = oldContext;
  }
};

export const getContext = () =>
  currContext;
