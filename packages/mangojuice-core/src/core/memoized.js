import MemoizedFieldCmd from '../classes/MemoizedFieldCmd';


export function memoized(computeFn) {
  return new MemoizedFieldCmd(computeFn);
}

export default memoized;
