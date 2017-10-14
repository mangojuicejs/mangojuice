import { noop, ensureCmdObject } from './Utils';


/**
 * Basic class for every logic class/object. Defines
 * types and available context varables (fields).
 */
export class LogicBase {
  depends(...deps) {
    return {
      computeFn: noop,
      deps: deps,
      compute(func) {
        this.computeFn = func;
        return this;
      }
    };
  }

  nest(logic) {
    return {
      logic,
      handler(handler) {
        this.execHandler = ensureCmdObject(handler);
        return this;
      },
      args(...args) {
        this.configArgs = args;
        return this;
      },
      singleton(val = true) {
        this.singletonValue = !!val;
        return this;
      }
    };
  }
}

export default LogicBase;
