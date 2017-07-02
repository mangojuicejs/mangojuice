export function loadTranslationsTask({ model, meta }) {
  return this.call(meta.languages[model.locale].translations);
}
