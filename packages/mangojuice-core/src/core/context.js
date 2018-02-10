import ContextCmd from '../classes/ContextCmd';


export function context(contextFn) {
  return new ContextCmd(contextFn);
}

export default context;
