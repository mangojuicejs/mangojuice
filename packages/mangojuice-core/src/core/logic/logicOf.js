import procOf from './procOf';


/**
 * Returns a Logic instqnce of given model object. Only if
 * it was binded to some logic. Otherwise it throws an exception.
 * If the optional second argument passed, then the function also
 * will check that the instance of logic is `instanceof` given
 * class.
 * @param  {Object} model
 * @param  {Class?} logicClass
 * @return {Process}
 */
function logicOf(model, logicClass) {
  const proc = procOf(model);
  if (logicClass && !(proc.logic instanceof logicClass)) {
    throw new Error(`Logic is not an instance of ${logicClass.constructor.name}`);
  }
  return proc.logic;
}

export default logicOf;
