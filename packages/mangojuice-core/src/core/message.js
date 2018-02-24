import Message from '../classes/Message';


export function message(msgCreator, ...args) {
  return new Message(msgCreator, args);
}

export default message;
