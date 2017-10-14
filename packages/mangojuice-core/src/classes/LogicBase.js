import { noop, ensureCmdObject } from '../core/Utils';


/**
 * Basic class for every logic class/object. Defines
 * types and available context varables (fields).
 */
export function LogicBase() {
}

LogicBase.prototype.depends = function(...deps) {
  return {
    computeFn: noop,
    deps: deps,
    compute(func) {
      this.computeFn = func;
      return this;
    }
  };
};

LogicBase.prototype.nest = function(logic) {
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
};

export default LogicBase;
