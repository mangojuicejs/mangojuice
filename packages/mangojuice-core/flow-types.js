// @flow

type TaskObject = {
  success: (cmd: any) => TaskObject,
  fail: (cmd: any) => TaskObject
};
type NestType<A, T, Y, U> = {
  +logic: A,
  args: (c1?: T, c2?: Y, c3?: U) => NestType<A, T, Y, U>,
  handler: () => NestType<A, T, Y, U>,
  singleton: (?Boolean) => NestType<A, T, Y, U>
};
type DependsType = {
  compute: (Function) => DependsType
};
interface ConfigFunction<MetaType, T, Y, U> {
  +config?: (c1?: T, c2?: Y, c3?: U) => ConfigType<MetaType>;
};
type ConfigType<M> = {
  initCommands?: any,
  meta?: M
};

declare module "mangojuice-core" {
  declare export var Cmd: {
    update: any,
    batch: any,
    execLatest: any,
    execEvery: any,
    debounce: any,
    throttle: any
  };

  declare export var Task: {
    create: (Function) => TaskObject;
  };

  declare export var Run: any;

  declare export var Utils: any;

  declare export class LogicBase<ModelType = any, SharedType = any, MetaType = any> {
    +model: ModelType;
    +shared: SharedType;
    +meta: MetaType;
    +destroy: Promise<any>;

    port(): ?Promise<any>;

    children(): {[key: $Enum<ModelType>]: NestType<*, *, *, *>};

    computed(): {[k: $Enum<ModelType>]: () => any | DependsType};

    exec(): Promise<any>;

    depends(...deps: Array<Object>): DependsType;

    nest<T, Y, U, L: ConfigFunction<MetaType, T, Y, U>&LogicBase<*,SharedType,*>>(logic: L): NestType<L, T, Y, U>;
  }

  declare export default {|
    +LogicBase: typeof LogicBase,
    +Run: typeof Run,
    +Task: typeof Task,
    +Cmd: typeof Cmd,
    +Utils: typeof Utils,
  |};
}
