/**
 * Block is a top level component in MangoJuice which consists of three parts:
 * - Model factory function `createModel` which should return a plain object.
 *   The main requirement for this function is that it should be able to return
 *   some model with zero arguments. But it can also accept some arguments
 *   as well.
 * - A logic class which implements {@link LogicBase} interface
 * - A View function which is aimed to render the model created by `createModel`
 *
 * The View part is optional and it could have different type depending on
 * selected View library to render a model and particular binding library.
 *
 * @interface Block
 * @example
 * // You can define block in short way using an object
 * const MyBlock = {
 *   createModel: () => ({ field: 1 }),
 *   Logic: class MyLogic {
 *     \@cmd SomeCommand() {
 *       return { field: this.model.field + 1 };
 *     }
 *   },
 *   View: ({ model }) => (
 *     <div>{model.field}</div>
 *   )
 * };
 *
 * run(MyBlock);
 * @example
 * // Or you can split it with modules (recommended)
 * // ./MyBlock/index.js
 * import Logic from './Logic';
 * import View from './View';
 * import { createModel } from './Model';
 * export default { View, Logic, createModel };
 * export { View, Logic, createModel };
 * export type { Model } from './Model';
 *
 * // ./MyBlock/Logic.js
 * import type { Model } from './Model';
 * import { LogicBase, cmd } from 'mangojuice-core';
 *
 * export default class MyLogic extends LogicBase<Model> {
 *   \@cmd SomeCommand() {
 *     return { field: this.model.field + 1 };
 *   }
 * }
 *
 * // ./MyBlock/Model.js
 * export type Model = { field: number };
 * export const createModel = () => ({
 *   field: 1
 * });
 *
 * // ./MyBlock/View.js
 * const MyBlockView = ({ model }) => (
 *   <div>{model.field}</div>
 * );
 * export default MyBlockView;
 *
 * // ./index.js
 * import MyBlock from './MyBlock';
 * import { run } from 'mangojuice-core';
 *
 * run(MyBlock);
 * @property {LogicBase} Logic   A logic class that should be attached to the model.
 * @property {Function} createModel  A function that shuld return a plain object which
 *                                   will be an init model of the block.
 * @property {?any} View  Something that some particular view library can render
 */
