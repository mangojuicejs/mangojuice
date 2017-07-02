import { Process, createContext } from "./Process";
import { NopeCmd } from "./Cmd";
import DefaultLogger from "./DefaultLogger";

/**
 * Create model and `Process` object and bind model to process.
 * Returns an object with process instance and model object.
 *
 * @param  {Object} options.Logic
 * @param  {Function} options.createModel
 * @param  {?Array} options.configArgs
 * @param  {?Object} sharedModel
 * @param  {?Object} appContext
 * @param  {Function} rawLogger
 * @param  {String} blockName
 * @return {Object}
 */
export const initProcess = (
  { Logic, createModel, configArgs },
  sharedModel,
  appContext,
  LoggerClass,
  blockName
) => {
  const model = createModel();
  const logger = new LoggerClass(blockName, model);
  const proc = new Process({
    logic: Logic,
    sharedModel: sharedModel || model,
    logger,
    appContext,
    configArgs
  });

  proc.bind(model);
  return { proc, model };
};

/**
 * Run the application by given app and shared blocks.
 * Returns an object with app and shared blocks init reuslts
 * with `run` field, which is Promise that will be resolved
 * when blocks will be succesfully ran.
 *
 * @param  {Object} options.shared
 * @param  {Object} options.app
 * @param  {?Function} options.logger
 * @return {Object}
 */
export const run = ({ shared, app, logger = DefaultLogger }) => {
  // Initizlize Process objects and bind to models
  const appContext = createContext();
  const sharedRes = initProcess(shared, null, appContext, logger, "shared");
  const appRes = initProcess(app, sharedRes.model, appContext, logger, "app");

  // Run processes after model binding (important to run after bind
  // for handling subscriptions in app for commands from shared)
  sharedRes.run = sharedRes.proc.run();
  appRes.run = appRes.proc.run();
  return { app: appRes, shared: sharedRes };
};

/**
 * Run the app and mount by given mounter object.
 * Returns an object with app running result (from `run` functiom)
 * with two additional fields: `view` with results from `mounter.mount`
 * function and `restart` with funciton to restart (re-run) the app
 * with current model.
 *
 * @param  {Object} props.app
 * @param  {Object} props.shared
 * @param  {?Function} props.logger
 * @param  {Mounter} props.mounter
 * @return {Object}
 */
export const mount = props => {
  const { app, shared } = run(props);
  const view = props.mounter.mount(app.proc, props.app.View);
  const restart = newProps => {
    shared.proc.destroy();
    app.proc.destroy();
    props.mounter.unmount();

    return rehydrate(app.model, shared.model, { ...props, ...newProps });
  };
  return { app, shared, view, restart };
};

export const rehydrate = (appModel, sharedModel, props) => {
  return mount({
    ...props,
    app: { ...props.app, createModel: () => appModel },
    shared: { ...props.shared, createModel: () => sharedModel }
  });
};

export const render = props => {
  const { app, shared } = run(props);
  const runPromise = Promise.all([app.run, shared.run]);

  return runPromise.then(() => {
    const html = props.mounter.mount(app.proc, props.app.View);
    app.proc.destroy();
    shared.proc.destroy();
    props.mounter.unmount();
    return { app, shared, html };
  });
};
