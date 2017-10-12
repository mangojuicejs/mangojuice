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
  ChangeLocale(ctx, nextLocale) {
    return [
      this.SetNewLocale(nextLocale),
      this.LoadMessages()
    ];
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
    return Task
      .create(Tasks.loadTranslationsTask)
      .success(this.SetMessages());
  }
};
