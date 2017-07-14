export function validatorTask({ meta, model }) {
  return this.call(meta.validator, model.value, model);
}
