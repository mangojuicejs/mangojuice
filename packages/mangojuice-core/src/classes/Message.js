import { extend, is } from '../core/utils';


function Message(msgCreator, args) {
  extend(this, msgCreator(...args));
  Object.defineProperty(this, '__name', { value: msgCreator.name });
  Object.defineProperty(this, '__creator', { value: msgCreator });
}

extend(Message.prototype, /** @lends LogicBase.prototype */{
  is(msgCreator) {
    const actualCreator = msgCreator && msgCreator.__creator || msgCreator;
    return this.__creator === actualCreator;
  },
  when(msgCreator, func) {
    if (this.is(msgCreator)) {
      return func(this);
    }
  }
});

export default Message;
