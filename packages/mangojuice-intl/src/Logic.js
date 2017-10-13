import { Cmd, Task } from 'mangojuice-core';
import * as Tasks from './Tasks';


export const Logic = {
  name: 'Intl',

  config(languages) {
    return {
      initCommands: this.LoadMessages,
      meta: { languages }
    };
  },

  @Cmd.batch
  ChangeLocale(nextLocale) {
    return [
      this.SetNewLocale(nextLocale),
      this.LoadMessages()
    ];
  },

  @Cmd.update
  SetNewLocale(nextLocale) {
    return { locale: nextLocale };
  },

  @Cmd.update
  SetMessages(messages) {
    return {
      messages,
      loaded: true
    };
  },

  @Cmd.execLatest
  LoadMessages() {
    return Task
      .create(Tasks.loadTranslationsTask)
      .success(this.SetMessages());
  }
};
