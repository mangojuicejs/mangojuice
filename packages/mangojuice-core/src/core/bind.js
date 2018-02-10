import Process from '../classes/Process';

/**
 * This function do the following:
 * - Creates a model object using {@link Block#createModel}. It is invoked without
 *   arguments.
 * - Create a {@link Process} instance with logic from {@link Block#Logic}
 * - Call {@link Process#bind} with created model
 *
 * Returns an object with created process instance, model object and given block.
 * Usefull when you want to prepare the block to run but you want to run it manually.
 *
 * @param  {Block} block   A {@link Block} object
 * @param  {?Object} opts  Options object that could change {@link Process} behaviour
 * @param  {?DefaultLogger} opts.logger   A custom logger instance that will be used in the
 *                                        Process to track commands execution. By default
 *                                        {@link DefaultLogger} will be used.
 * @param  {?Object} opts.shared     An object that will be available in any logic in the
 *                                   tree as `this.shared`. Could be anything you want, but
 *                                   you will get more benifites if you will pass model object
 *                                   with attached Process as shared object to be able to make
 *                                   computed fields with depending of shared model.
 * @param  {?Array<any>} opts.args        An array of arguments that will be passed to {@link LogicBase#config}
 *                                        of the logic.
 * @param  {?Process} opts.Process   A class that will be used instead of {@link Process}. By default
 *                                   general {@link Process} is used, but you can customize it for your
 *                                   specific needs and pass here. Then every other process in the tree
 *                                   will be an instance of this custom {@link Process} implementation
 * @return {{
 *   proc: Process,
 *   model: Object,
 *   block: Block
 * }} An object with {@link Process} instance, model object and block that was passed to
 *    the function
 */
function bind(block, opts = {}) {
  const ProcessClass = opts.Process || Process;
  const model = opts.model || {};
  const proc = new ProcessClass({
    logger: opts.logger,
    logicClass: block.Logic,
    createArgs: opts.args || []
  });
  proc.bind(model);
  return { proc, model, block };
}

export default bind;
