// @flow
declare module "mangojuice-core" {

  declare type TaskObject = {
    notify: (cmd: any) => TaskObject,
    success: (cmd: any) => TaskObject,
    fail: (cmd: any) => TaskObject,
    args: (...args: Array<any>) => TaskObject,
    engine: (exec: any) => TaskObject
  };

  declare type DependsType = {
    compute: (Function) => DependsType,
    computeFn: Function
  };

  declare type LogicConfig<MetaType> = {
    initCommands?: any,
    meta?: MetaType
  };

  declare type ConfiguredLogic = {
    shared: (sharedModel: any) => ConfiguredLogic
  };

  declare type BlockType = {
    createModel: (...args: any) => Object,
    Logic: Class<*>,
    View?: any
  };

  declare export class Command {
    is: (...args: any) => bool,
    args: Array<any>,
    model: Object
  }

  declare export class LogicBase<ModelType = any, SharedType = any, MetaType = any> {
    +model: ModelType;
    +shared: SharedType;
    +meta: MetaType;

    hubBefore(cmd: Command): any;

    hubAfter(cmd: Command): any;

    port(exec: (cmd: any) => Promise<any>, destroyed: Promise<any>): ?Promise<any>;

    children(...args: any): {[k: $Enum<ModelType>]: Class<*> | ConfiguredLogic};

    computed(): {[k: $Enum<ModelType>]: (() => any) | DependsType};

    config(...args: any): LogicConfig<MetaType>;
  }

  declare export function cmd(): any;

  declare export function defineCommand(): any;

  declare export function decorateLogic<T>(clazz: Class<T>, deep?: bool): Class<T>;

  declare export function task(fn: Function): TaskObject;

  declare export function delay(ms: number): Promise<void>;

  declare export function cancel(cmd: any): any;

  declare export function logicOf<T>(model: Object, clazz?: Class<T>): T;

  declare export function procOf(model: Object): any;

  declare export function child<T>(logicClass: Class<{
    +config?: (...args: T) => any,
    +children?: (...args: T) => any
  }>, ...args: T): ConfiguredLogic;

  declare export function depends(...args: any): DependsType;

  declare export function observe(model: Object, handler: Function): void;

  declare export function handle(model: Object, handler: Function): void;

  declare export function run(block: BlockType, opts?: Object): any;

  declare export function bind(block: BlockType, opts?: Object): any;

  declare export function mount(mounter: any, blockRes: any, ...otherBlocks: Array<any>): any;

  declare export function hydrate(block: BlockType, model: Object): any;

  declare export var utils: any;

  declare export var config: any;

  declare export default {|
    +LogicBase: typeof LogicBase,
    +Command: typeof Command,
    +cmd: typeof cmd,
    +defineCommand: typeof defineCommand,
    +task: typeof task,
    +delay: typeof delay,
    +cancel: typeof cancel,
    +logicOf: typeof logicOf,
    +procOf: typeof procOf,
    +child: typeof child,
    +depends: typeof depends,
    +observe: typeof observe,
    +handle: typeof handle,
    +handleAfter: typeof handle,
    +handleBefore: typeof handle,
    +run: typeof run,
    +bind: typeof bind,
    +mount: typeof mount,
    +hydrate: typeof hydrate,
    +utils: typeof utils,
    +config: typeof config
  |};
}
