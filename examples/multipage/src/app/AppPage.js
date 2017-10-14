import React from "mangojuice-react";
import { Cmd, Utils, Task } from "mangojuice-core";
import { Routes, MailRoutes } from "src/routes";
import * as Intl from "mangojuice-intl";
import * as Router from "mangojuice-router";
import * as User from "src/shared/User";
import * as News from "mangojuice-lazy/loader!./news/NewsPage";
import * as Mail from "mangojuice-lazy/loader!./mail/MailPage";
import * as Letter from "mangojuice-lazy/loader!./mail/Letter";
import * as LoginLightbox from "mangojuice-lazy/loader!./lightboxes/Login";

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
export const Logic = {
  name: "AppPage",

  children() {
    return {
      mail: this.nest(Mail.Logic).handler(this.HandleMail),
      news: this.nest(News.Logic),
      login: this.nest(LoginLightbox.Logic)
    };
  },

  @Cmd.batch
  ShowNotification(message: String) {
    return [this.SetNotificationMsg(message), this.DelayHideNotification()];
  },

  @Cmd.execLatest
  DelayHideNotification() {
    return Task.create(async function() {
      await this.call(Task.delay, 3000);
    }).success(this.SetNotificationMsg(""));
  },

  @Cmd.update
  SetNotificationMsg(message: string) {
    return { notification: message };
  },

  @Cmd.update
  LogModel() {
    console.log(JSON.stringify(this.model, null, 2));
    console.log(JSON.stringify(this.shared, null, 2));
  },

  @Cmd.batch
  HandleMail(cmd) {
    if (cmd.is(Letter.Logic.Delete)) {
      return this.ShowNotification(Messages.letterRemoved);
    }
  },

  @Cmd.batch
  ChangeLocale(lang) {
    return Intl.Logic.ChangeLocale(lang);
  },

  @Cmd.batch
  OpenInbox() {
    return MailRoutes.Inbox({ box: this.shared.route.params.box || 0 });
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

export const View = ({ model, shared }) =>
  shared.intl.loaded &&
  <div>
    {!!model.notification && (
      <h1>
        {Intl.formatMessage(shared.intl, model.notification)}
      </h1>
    )}
    <h1>
      {Intl.formatMessage(shared.intl, Messages.title)}
    </h1>
    <div>
      <button onClick={Logic.ChangeLocale("ru")}>Ru</button>
      <button onClick={Logic.ChangeLocale("en")}>En</button>
    </div>
    <ul>
      <li>
        <a onClick={Logic.OpenInbox}>
          {Intl.formatMessage(shared.intl, Messages.mail)}
          {Router.isActive(shared.route, Routes.Mail) && " <---"}
        </a>
      </li>
      <li>
        <a onClick={Logic.OpenNews}>
          {Intl.formatMessage(shared.intl, Messages.news)}
          {Router.isActive(shared.route, Routes.News) && " <---"}
        </a>
      </li>
    </ul>
    {Router.isActive(shared.route, Routes.Mail) && <Mail.View model={model.mail} />}
    {Router.isActive(shared.route, Routes.News) && <News.View model={model.news} />}
    {Router.isNotFound(shared.route) && <span>Page not found :(</span>}
    {shared.route.query.auth && <LoginLightbox.View model={model.login} />}
    <div>
      <button onClick={Logic.OpenLogin}>Open Login</button>
      <button onClick={Logic.LogModel}>Log model</button>
    </div>
  </div>;
