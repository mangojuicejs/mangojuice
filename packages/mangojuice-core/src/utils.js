export const is = {
  undef: v => v === null || v === undefined,
  notUndef: v => v !== null && v !== undefined,
  func: f => typeof f === "function",
  number: n => typeof n === "number",
  string: s => typeof s === "string",
  array: Array.isArray,
  object: obj => obj && !is.array(obj) && typeof obj === "object",
  promise: p => p && is.func(p.then),
  iterator: it => it && is.func(it.next) && is.func(it.throw),
  iterable: it =>
    it && is.func(Symbol) ? is.func(it[Symbol.iterator]) : is.array(it)
};

export const sym = id => `@@mangojuice/${id}`;

export function autoInc(seed = 1) {
  return () => ++seed;
}

export const nextId = autoInc();

export const emptyArray = [];

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

export const createResultPromise = () => {
  let res = Promise.resolve();
  return {
    get() {
      return res;
    },
    add(nextPromise) {
      res = res.then(() => nextPromise);
      return this;
    }
  };
};
