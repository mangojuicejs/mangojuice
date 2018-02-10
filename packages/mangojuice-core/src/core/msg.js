import Message from '../classes/Message';


function arrayDataGet(...args) {
  return args
}

export function msg(dataGen = arrayDataGet) {
  const creator = (...args) =>
    new Message(dataGen(...args), creator);
  return creator;
}

export default msg;
