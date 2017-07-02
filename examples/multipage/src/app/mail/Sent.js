// @flow
import type { LogicObj, ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import React from "react";
import { Cmd } from "@mangojuice/core";
import { MailRoutes } from "src/routes";
import * as Intl from "@mangojuice/core/blocks/Intl";
import * as Router from "@mangojuice/core/blocks/Router";

// Model
export type Model = {
  letters: Array<any>
};

export const createModel = (): Model => ({
  letters: []
});

// Logic
export const Logic: LogicObj<Model, SharedModel> = {
  name: "Sent",

  config({ subscribe, shared }) {
    return {
      subs: subscribe(this.HandlerRouter(), shared.route)
    };
  },

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

export const View: ViewFn<Model, SharedModel> = ({ model, shared }) =>
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
