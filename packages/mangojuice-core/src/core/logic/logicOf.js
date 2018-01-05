import procOf from './procOf';


/**
 * Returns a Logic instance attached to a given model object. The logic
 * instance stored in attached {@link Process} instance, so it execute
 * {@link procOf} for the model to get a {@link Process} instance and then
 * get the logic instance form a Process and return it.
 *
 * If Process is not attached to the model, then an Error will be throwed.
 * If the second argument passed then it will also check that the logic
 * instance is instance of some particular class.
 *
 * @param  {Object} model        A model with attached {@link Process}
 * @param  {Class?} logicClass   Optional logic class to check that the logic
 *                               instance is instance of the class
 * @return {LogicBase} Returns a logic instance
 */
function logicOf(model, logicClass) {
  const proc = procOf(model);
  if (logicClass && !(proc.logic instanceof logicClass)) {
    throw new Error(
      `Logic is not an instance of ${logicClass.constructor.name}`
    );
  }
  return proc.logic;
}

export default logicOf;
