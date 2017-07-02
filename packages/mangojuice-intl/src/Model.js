export type Model = {
  locale: string,
  messages: { [key: string]: string },
  loaded: boolean
};

type Languages = {
  [key: string]: {
    default?: boolean,
    name: string,
    translations: () => Promise<{ [key: string]: string }>
  }
};

export const createModel = (languages: Languages): Model => {
  const langs = Object.keys(languages);
  const defaultLang = langs.find(k => languages[k].default) || langs[0];

  return {
    messages: {},
    locale: defaultLang,
    loaded: false
  };
};
