import Process from '../classes/Process';


/**
 * Run given block. It is a short-hand function for running {@link bind}
 * and then running a Process by {@link Process#run}.
 * Also it returns an additional `finished` Promise which is resolved
 * when all async tasks finished and all handler commands executed.
 *
 * @param  {Block} block  A block that you wan to run
 * @param  {Object} opts  Same options as in {@link bind}
 * @return {{ proc: Process, model: Object, block: Block, finished: Promise }}  An object
 *                  which is almost the same as returned from {@link bind}, but with
 *                  additional `finished` field, which is a Promise that will be resolved
 *                  when all blocks will execute all commands and all async tasks will be
 *                  finished.
 */
function run(block, opts = {}) {
  const ProcessClass = opts.Process || Process;
  const model = opts.model;
  const proc = new ProcessClass({
    logger: opts.logger,
    logicClass: block.Logic || block,
    createArgs: opts.args || []
  });

  proc.bind(model);
  proc.run(!!model);

  return proc.model;
}

export default run;
