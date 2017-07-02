// @flow
export default {
  en: {
    default: true,
    name: "English",
    translations: () => Promise.resolve(require("./translations/en").default)
  },
  ru: {
    name: "Русский",
    translations: () => Promise.resolve(require("./translations/ru").default)
  }
};
