// @flow
import type { LogicFn, CmdsObj } from "../types";
import { Cmd, Task } from "../";

// Model
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

// Logic
export const Logic = {
  name: "Intl",

  config(ctx, languages) {
    return {
      bindCommands: this,
      initCommands: this.LoadMessages(),
      meta: { languages }
    };
  },

  @Cmd.batch
  ChangeLocale(ctx, nextLocale) {
    return [this.SetNewLocale(nextLocale), this.LoadMessages()];
  },

  @Cmd.update
  SetNewLocale(ctx, nextLocale) {
    return { locale: nextLocale };
  },

  @Cmd.update
  SetMessages(ctx, messages) {
    return {
      messages,
      loaded: true
    };
  },

  @Cmd.execLatest
  LoadMessages() {
    return Task.create(loadTranslationsTask).success(this.SetMessages());
  }
};

// Utils
export const formatMessage = (
  model: Model,
  id: string,
  ...args: Array<any>
): string => {
  const format = model.messages[id];
  return format ? formatString(format, args) : id;
};

export const formatString = (format: string, args: Array<any>) => {
  return format.replace(/{(\d+)}/g, (match, num) => {
    return typeof args[num] != "undefined" ? args[num] : match;
  });
};

export async function loadTranslationsTask({ model, meta }) {
  return await this.call(meta.languages[model.locale].translations);
}
