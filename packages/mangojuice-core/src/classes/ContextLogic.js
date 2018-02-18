import { extend } from '../core/utils';


const ContextLogic = function() {};

extend(ContextLogic.prototype, {
  create(creator, args) {
    return creator.apply(null, args);
  }
});

export default ContextLogic;
