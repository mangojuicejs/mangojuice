export const is = {
  undef: v => v === null || v === undefined,
  notUndef: v => v !== null && v !== undefined,
  func: f => typeof f === 'function',
  number: n => typeof n === 'number',
  string: s => typeof s === 'string',
  bool: s => s === true || s === false,
  array: Array.isArray,
  object: obj => obj && !is.array(obj) && typeof obj === 'object',
  promise: p => p && is.func(p.then),
  generator: obj => is.func(obj.next) && is.func(obj.throw),
  generatorFunc: obj => {
    var constructor = obj.constructor;
    if (!constructor) return false;
    if (
      'GeneratorFunction' === constructor.name ||
      'GeneratorFunction' === constructor.displayName
    ) return true;
    return is.generator(constructor.prototype);
  }
};

export const noop = () => null;

export const sym = id => `@@mangojuice/${id}`;

/**
 * A symbol for setting custom promise cancel function.
 * You can use it to specify some specific logic that
 * should be executed when some task canceled. Like for
 * `delay` function you can clear a timer
 * (see `delay` sources below).
 * @private
 * @type {string}
 */
export const CANCEL = sym('CANCEL_PROMISE');

export function autoInc(seed = 1) {
  return () => ++seed;
}

export const nextId = autoInc();

export const identify = (val) => {
  if (!val.__id) {
    Object.defineProperty(val, '__id', {
      value: nextId(),
      enumerable: false,
      configurable: false
    });
  }
  return val.__id;
};

export const fastFind = (subject, comparator) => {
  const length = subject.length;
  for (let i = 0; i < length; i++) {
    if (comparator(subject[i], i)) {
      return subject[i];
    }
  }
};

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

export const maybeMap = (subject, mapper) => {
  if (is.array(subject)) {
    return fastMap(subject, x => mapper(x));
  } else if (is.notUndef(subject)) {
    return [mapper(subject, 0)];
  }
  return [];
}

export const maybeForEach = (subject, iterator) => {
  if (is.array(subject)) {
    fastForEach(subject, x => iterator(x));
  } else if (is.notUndef(subject)) {
    iterator(subject, 0);
  }
}

export const maybeFind = (subject, comparator) => {
  if (is.array(subject)) {
    return fastFind(subject, comparator);
  } else {
    return comparator(subject, 0);
  }
}

export const deepForEach = (vals, fn) => {
  maybeForEach(vals, function deepMapIterator(v) {
    if (is.array(v)) {
      deepForEach(v, fn);
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
  momoizer.computed = () => computed;
  momoizer.reset = () => {
    data = undefined;
    computed = false;
  };
  return momoizer;
};

export function safeExecFunction(logger, func, proc, cmd) {
  const { result, error } = fastTry(func);
  if (error && logger) {
    logger.onCatchError(error, proc, cmd);
  }
  return result;
}

/**
 * A helper function for delaying execution. Returns a Promise
 * which will be resolved in given amount of milliseconds. You can
 * use it in {@link task} to implement some delay in execution, for
 * debouncing for example.
 *
 * @param  {number}  ms  An amount of milliseconds to wait
 * @return {Promise} A promise that resolved after given amount of milliseconds
 */
export function delay(ms) {
  let timeoutId;
  const res = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(), ms);
  });
  res[CANCEL] = () => clearTimeout(timeoutId);
  return res;
}

