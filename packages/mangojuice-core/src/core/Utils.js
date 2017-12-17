export const is = {
  undef: v => v === null || v === undefined,
  notUndef: v => v !== null && v !== undefined,
  func: f => typeof f === 'function',
  number: n => typeof n === 'number',
  string: s => typeof s === 'string',
  bool: s => s === true || s === false,
  array: Array.isArray,
  object: obj => obj && !is.array(obj) && typeof obj === 'object',
  promise: p => p && is.func(p.then)
};

export const noop = () => null;

export const sym = id => `@@mangojuice/${id}`;

export function autoInc(seed = 1) {
  return () => ++seed;
}

export const nextId = autoInc();

export const fastForEach = (subject, iterator) => {
  const length = subject.length;
  for (let i = 0; i < length; i++) {
    iterator(subject[i], i, subject);
  }
};

export const fastMap = (subject, iterator) => {
  const length = subject.length;
  const result = new Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = iterator(subject[i], i, subject);
  }
  return result;
};

export const ensureError = err =>
  !(err instanceof Error) ? new Error(err) : err;

export const fastTry = fn => {
  try {
    return { result: fn(), error: null };
  } catch (err) {
    return { result: null, error: ensureError(err) };
  }
};

export const runOnMixed = (mapper, val, fn) => {
  if (is.array(val)) {
    return mapper(val, x => x && fn(x));
  } else if (is.notUndef(val)) {
    const res = fn(val);
    return mapper === fastMap ? [res] : undefined;
  }
  return mapper === fastMap ? [] : undefined;
};

export const maybeMap = runOnMixed.bind(null, fastMap);

export const maybeForEach = runOnMixed.bind(null, fastForEach);

export const deepForEach = (vals, fn) => {
  maybeForEach(vals, function deepMapIterator(v) {
    if (is.array(v)) {
      deepForEach(v, fn, res);
    } else {
      fn(v);
    }
  });
};

export function extend(obj, props) {
  if (props) {
    for (let i in props) {
      obj[i] = props[i];
    }
  }
  return obj;
}

export const memoize = func => {
  let data;
  let computed = false;
  const momoizer = (...args) => {
    if (!computed) {
      computed = true;
      data = func(...args);
    }
    return data;
  };
  momoizer.reset = () => {
    data = undefined;
    computed = false;
  };
  return momoizer;
};

export function safeExecFunction(logger, func, context) {
  const { result, error } = fastTry(func);
  if (error && logger) {
    logger.onCatchError(error, context);
  }
  return result;
}
