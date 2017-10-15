export function loadTranslationsTask({ meta, model }) {
  return this.call(meta.languages[model.locale].translations);
}
