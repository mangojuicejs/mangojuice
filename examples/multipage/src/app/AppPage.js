// @flow
import type { LogicObj, ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import React from "react";
import { Cmd, Utils, Task } from "@mangojuice/core";
import { Routes, MailRoutes } from "src/routes";
import { formatMessage } from "utils/format";
import * as Router from "@mangojuice/core/blocks/Router";
import * as User from "src/shared/User";
import * as News from "@mangojuice/core/lazy!./news/NewsPage";
import * as Mail from "@mangojuice/core/lazy!./mail/MailPage";
import * as Letter from "@mangojuice/core/lazy!./mail/Letter";
import * as LoginLightbox from "@mangojuice/core/lazy!./lightboxes/Login";

// Model
export type Model = {
  mail: Mail.Model,
  news: News.Model,
  login: LoginLightbox.Model,
  notification: string
};

export const createModel = () => ({
  mail: Mail.createModel(),
  news: News.createModel(),
  login: LoginLightbox.createModel(),
  notification: ""
});

// Logic
export const Logic: LogicObj<Model, SharedModel> = {
  name: "AppPage",

  config({ nest }) {
    return {
      children: {
        mail: nest(this.HandleMail(), Mail.Logic),
        news: nest(null, News.Logic),
        login: nest(null, LoginLightbox.Logic)
      }
    };
  },

  @Cmd.batch
  ShowNotification(ctx, message: String) {
    return [this.SetNotificationMsg(message), this.DelayHideNotification()];
  },

  @Cmd.execLatest
  DelayHideNotification() {
    return Task.create(function*() {
      yield Task.call(Utils.delay, 3000);
    }).success(this.SetNotificationMsg(""));
  },

  @Cmd.update
  SetNotificationMsg(ctx, message: string) {
    return { notification: message };
  },

  @Cmd.update
  LogModel({ model, shared }) {
    console.log(JSON.stringify(model, null, 2));
    console.log(JSON.stringify(shared, null, 2));
  },

  @Cmd.handle
  HandleMail(ctx, cmd) {
    if (cmd.is(Letter.Logic.Delete)) {
      return this.ShowNotification(Messages.letterRemoved);
    }
  },

  @Cmd.batch
  ChangeLocale(ctx, lang) {
    return Intl.Logic.ChangeLocale(lang);
  },

  @Cmd.batch
  OpenInbox({ shared }) {
    return MailRoutes.Inbox({ box: shared.route.params.box || 0 });
  },

  @Cmd.batch
  OpenNews() {
    return Routes.News();
  },

  @Cmd.batch
  OpenLogin() {
    return Router.Logic.Query({ auth: 1 }, { keep: true });
  }
};

// View
export const Messages = {
  letterRemoved: "APP.LETTER_REMOVED",
  title: "APP.TITLE",
  news: "NEWS.TITLE",
  mail: "MAIL.TITLE"
};

export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  shared.intl.loaded &&
  <div>
    {!!model.notification &&
      <h1>
        {formatMessage(shared.intl, model.notification)}
      </h1>}
    <h1>
      {formatMessage(shared.intl, Messages.title)}
    </h1>
    <div>
      <button onClick={exec(Logic.ChangeLocale("ru"))}>Ru</button>
      <button onClick={exec(Logic.ChangeLocale("en"))}>En</button>
    </div>
    <ul>
      <li>
        <a onClick={exec(Logic.OpenInbox())}>
          {formatMessage(shared.intl, Messages.mail)}
          {Router.isActive(shared.route, Routes.Mail) && " <---"}
        </a>
      </li>
      <li>
        <a onClick={exec(Logic.OpenNews())}>
          {formatMessage(shared.intl, Messages.news)}
          {Router.isActive(shared.route, Routes.News) && " <---"}
        </a>
      </li>
    </ul>
    {Router.whenRoute(shared.route, Routes.Mail, () =>
      nest(model.mail, Mail.View)
    )}
    {Router.whenRoute(shared.route, Routes.News, () =>
      nest(model.news, News.View)
    )}
    {Router.whenNotFound(shared.route, () => <span>Page not found :(</span>)}
    {shared.route.query.auth && nest(model.login, LoginLightbox.View)}
    <div>
      <button onClick={exec(Logic.OpenLogin())}>Open Login</button>
      <button onClick={exec(Logic.LogModel())}>Log model</button>
    </div>
  </div>;
