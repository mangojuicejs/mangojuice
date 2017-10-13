export function loadTranslationsTask() {
  return this.call(this.meta.languages[this.model.locale].translations);
}
