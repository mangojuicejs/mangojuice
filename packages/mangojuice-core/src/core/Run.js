import { Process, createContext } from "./Process";
import { NopeCmd } from "./Cmd";
import { emptyArray } from './Utils';
import DefaultLogger from "./DefaultLogger";

// Constants
const EMPTY_BLOCK = {
  createModel: () => ({}),
  Logic: {},
  View: () => {}
};

/**
 * Create model and `Process` object and bind model to process.
 * Returns an object with process instance and model object.
 * Created process is singleton by default (because it is a root
 * of a tree).
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
  LoggerClass = DefaultLogger,
  blockName = "app",
  singleton = false
) => {
  const model = createModel();
  const logger = new LoggerClass(blockName, model);
  const proc = new Process({
    logic: Logic,
    sharedModel: sharedModel || model,
    singletonValue: singleton,
    logger,
    appContext,
    configArgs,
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
 * @param  {?Object} options.shared
 * @param  {?Object} options.app
 * @param  {Class} options.logger
 * @return {Object}
 */
export const run = ({ app = EMPTY_BLOCK, shared = EMPTY_BLOCK, logger }) => {
  // Initizlize Process objects and bind to models
  const appContext = createContext();
  const sharedRes = initProcess(shared, null, appContext, logger, "shared", true);
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
 * @param  {?Object} props.app
 * @param  {?Object} props.shared
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

/**
 * By given app model and shared model "rehydrate" the app –
 * run it using provided models instead of creating new
 * model in process initiation stage.
 *
 * @param  {Object} appModel
 * @param  {OBject} sharedModel
 * @param  {Object} props
 * @return {Object}
 */
export const rehydrate = (appModel = {}, sharedModel = {}, props) => {
  return mount({
    ...props,
    app: { ...props.app, createModel: () => appModel },
    shared: { ...props.shared, createModel: () => sharedModel }
  });
};

/**
 * Render app once. It is different from `mount` because this
 * function returns a Promise that will be resolved when all
 * commands, started at startup of the app, will be executed.
 * In resolved object you can find app, shared and `html` – the
 * result returned by provided mounter.
 *
 * @param  {Object} props
 * @return {Promise}
 */
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

/**
 * Function creates an object for rendering already created model
 * in scope of one application by given view and logic. All
 * logic is running independently and connects with each other
 * only in one app context.
 * @param  {Object} props
 * @return {Object}
 */
export const createRenderer = ({
  mounter: defMounter,
  defaultLogger = DefaultLogger
}) => {
  const loggerImpl = new defaultLogger('app');
  const appContext = createContext();

  return ({
    View, Logic, model, shared,
    logger = loggerImpl,
    config = emptyArray,
    mounter = defMounter
  }) => {
    let runRes = Promise.resolve();
    if (model && !model.__proc) {
      const proc = new Process({
        logic: Logic,
        sharedModel: shared || model,
        configArgs: config,
        appContext,
        logger
      });
      proc.bind(model);
      runRes = proc.run();
    }
    return {
      view: mounter.mount(model.__proc, View),
      done: runRes
    };
  };
};
