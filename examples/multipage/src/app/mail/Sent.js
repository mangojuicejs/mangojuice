import React from "mangojuice-react";
import { Cmd, Utils } from "mangojuice-core";
import { MailRoutes } from "src/routes";
import * as Intl from "mangojuice-intl";
import * as Router from "mangojuice-router";

// Model
export type Model = {
  letters: Array<any>
};

export const createModel = (): Model => ({
  letters: []
});

// Logic
export const Logic = {
  name: "Sent",

  port({ exec, shared, destroy }) {
    Utils.handleModelChanges(shared.route, () => exec(this.HandlerRouter()), destroy);
    return exec(this.HandlerRouter());
  }

  @Cmd.nope InitSentLetters() {},

  @Cmd.batch
  HandlerRouter({ shared }) {
    if (Router.isFirstAppear(shared.route, MailRoutes.Sent)) {
      return this.InitSentLetters();
    }
  }
};

// View
export const Messages = {
  for: "MAIL.SENT.FOR"
};

export const View = ({ model, shared }) =>
  <div>
    <h2>
      {Intl.formatMessage(shared.intl, Messages.for, shared.user.name)}
    </h2>
    {model.letters.map(letter =>
      <p>
        {letter.title}
      </p>
    )}
  </div>;
