import ComputedFieldCmd from '../classes/ComputedFieldCmd';

/**
 * Function that helps to describe a computed field with external
 * model dependncies. Should be used in {@link LogicBase#computed}.
 * It creates an instance of {@link ComputedFieldCmd} with dependencies
 * passed as arguments.
 *
 * A compute field with external dependencies is a field that should
 * be updated (re-computed) not only when the own model udpated, but
 * also when depdendency models updated.
 *
 * @example
 * class ChildLogic {
 *   // some logic
 * }
 * class MyLogic {
 *   children() {
 *     return { childModel: ChildLogic };
 *   }
 *   computed() {
 *     return {
 *       // depends on `childModel`
 *       computedField: depends(this.model.childModel).compute(() => {
 *         return this.model.a + this.model.childModel.b;
 *       }),
 *
 *       // depends on `shared` model
 *       computeWithShared: depends(this.shared).compute(() => {
 *         return this.model.b + this.shared.someField;
 *       })
 *     }
 *   }
 * }
 * @param  {...deps} deps  A list of models with attached logic
 * @return {ComputedFieldCmd}
 */
export function depends(...deps) {
  return new ComputedFieldCmd(deps);
}

export default depends;
