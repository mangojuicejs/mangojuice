import { extend, is } from '../core/utils';


function Message(data, creator) {
  extend(this, data);
  Object.defineProperty(this, '__creator', { value: creator });
}

extend(Message.prototype, /** @lends LogicBase.prototype */{
  when(eventCreator, func) {
    if (this.__creator === eventCreator) {
      return func(this);
    }
  }
});

export default Message;
