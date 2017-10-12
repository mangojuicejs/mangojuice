// Constants
export const MODEL_UPDATED_EVENT = "updated";
export const CHILD_MODEL_UPDATED_EVENT = "childUpdated";
export const DESTROY_MODEL_EVENT = "destroy";

// Utils
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

export const ensureCmdObject = cmd => {
  if (!cmd) return null;
  if (!cmd.isCmd) {
    if (cmd.id && is.func(cmd)) {
      return cmd();
    } else {
      throw new Error("You passed something weird instead of cmd");
    }
  }
  return cmd;
};

export const handleModelChanges = (model, handler, destroy) => {
  if (model.__proc) {
    const proc = model.__proc;
    proc.addListener(MODEL_UPDATED_EVENT, handler);
    if (destroy && destroy.then) {
      destroy.then(() => proc.removeListener(MODEL_UPDATED_EVENT, handler));
    }
  }
  return  Promise.resolve();
};

export const objectValues = (obj) => {
  return obj ? Object.keys(obj).map(k => obj[k]) : [];
};

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
