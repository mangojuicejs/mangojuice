export const is = {
  undef: v => v === null || v === undefined,
  notUndef: v => v !== null && v !== undefined,
  func: f => typeof f === "function",
  number: n => typeof n === "number",
  string: s => typeof s === "string",
  bool: s => s === true || s === false,
  array: Array.isArray,
  object: obj => obj && !is.array(obj) && typeof obj === "object",
  promise: p => p && is.func(p.then),
  iterator: it => it && is.func(it.next) && is.func(it.throw),
  command: cmd => cmd && cmd.id && cmd.Before && cmd.After,
  iterable: it =>
    it && is.func(Symbol) ? is.func(it[Symbol.iterator]) : is.array(it)
};

export const noop = () => {};

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

export const ensureError = (err) =>
  !(err instanceof Error) ? new Error(err) : err;

export const fastTry = (fn) => {
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

export const deepMap = (vals, fn, res = []) => {
  maybeForEach(vals, function deppMapIterator(v) {
    if (is.array(v)) {
      return deepMap(v, fn, res);
    } else {
      res.push(fn(v));
    }
  });
  return res;
};

export const createResultPromise = () => {
  let res = Promise.resolve();
  return {
    get() {
      return res;
    },
    add(nextPromise) {
      if (nextPromise !== res) {
        res = res.then(() => nextPromise);
      }
      return this;
    }
  };
};


export function extend(obj, props) {
  for (let i in props) obj[i] = props[i];
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
