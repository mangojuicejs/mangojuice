// @flow
type CommandType<M> = {
  is: (...args: any) => bool,
  model: M,
};

type TaskObject = {
  success: (cmd: any) => TaskObject,
  fail: (cmd: any) => TaskObject,
  args: (...args: Array<any>) => TaskObject,
  engine: (exec: any) => TaskObject
};

type DependsType = {
  compute: (Function) => DependsType
};

type LogicConfig<MetaType> = {
  initCommands?: any,
  meta?: MetaType
};

type ConfiguredLogic = {
};

type BlockType = {
  createModel: (...args: any) => Object,
  Logic: Class<*>,
  View?: any
};

declare module "mangojuice-core" {
  declare export function cmd(): any;

  declare export function debounce(): any;

  declare export function throttle(): any;

  declare export function task(fn: Function): TaskObject;

  declare export function delay(ms: number): Promise<void>;

  declare export function cancel(cmd: any): any;

  declare export function logicOf<T>(model: Object, clazz?: Class<T>): T;

  declare export function child<T>(logicClass: Class<{ +config?: (...args: T) => any }>, ...args: T): ConfiguredLogic;

  declare export function depends(...args: any): DependsType;

  declare export function observe(model: Object, destroyeded: Promise<any>, handler: Function): void;

  declare export function run(block: BlockType, opts?: Object): any;

  declare export function bind(block: BlockType, opts?: Object): any;

  declare export function hydrate(block: BlockType, model: Object): any;

  declare export var utils: any;

  declare export class LogicBase<ModelType = any, SharedType = any, MetaType = any> {
    +model: ModelType;
    +shared: SharedType;
    +meta: MetaType;

    hub(cmd: CommandType<*>): ?Promise<any>;

    hubBefore(cmd: CommandType<*>): ?Promise<any>;

    hubAfter(cmd: CommandType<*>): ?Promise<any>;

    port(exec: (cmd: any) => Promise<any>, destroyed: Promise<any>): ?Promise<any>;

    children(): {[k: $Enum<ModelType>]: Class<*> | ConfiguredLogic};

    computed(): {[k: $Enum<ModelType>]: (() => any) | DependsType};

    config(...args: any): LogicConfig<MetaType>;
  }

  declare export default {|
    +LogicBase: typeof LogicBase,
    +cmd: typeof cmd,
    +debounce: typeof debounce,
    +throttle: typeof throttle,
    +task: typeof task,
    +delay: typeof delay,
    +cancel: typeof cancel,
    +logicOf: typeof logicOf,
    +child: typeof child,
    +depends: typeof depends,
    +observe: typeof observe,
    +run: typeof run,
    +bind: typeof bind,
    +hydrate: typeof hydrate,
    +utils: typeof utils
  |};
}
