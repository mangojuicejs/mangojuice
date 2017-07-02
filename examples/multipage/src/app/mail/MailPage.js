// @flow
import type { LogicObj, ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import React from "react";
import { Cmd } from "@mangojuice/core";
import { MailRoutes } from "src/routes";
import * as Intl from "@mangojuice/core/blocks/Intl";
import * as Router from "@mangojuice/core/blocks/Router";
import * as Inbox from "@mangojuice/core/lazy!./Inbox";
import * as Sent from "@mangojuice/core/lazy!./Sent";

// Model
export type Model = {
  inbox: Inbox.Model,
  sent: Sent.Model
};

export const createModel = (): Model => ({
  inbox: Inbox.createModel(),
  sent: Sent.createModel()
});

// Logic
export const Logic: LogicObj<Model, SharedModel> = {
  name: "MailPage",

  config({ nest }) {
    return {
      children: {
        inbox: nest(null, Inbox.Logic),
        sent: nest(null, Sent.Logic)
      }
    };
  },

  @Cmd.batch
  OpenLatestBox({ shared }) {
    return MailRoutes.Inbox({ box: shared.route.params.box || 0 });
  },

  @Cmd.batch
  OpenSent() {
    return MailRoutes.Sent();
  }
};

// View
export const Messages = {
  inbox: "MAIL.INBOX_TITLE",
  sent: "MAIL.SENT_TITLE"
};

export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  <div>
    <ul>
      <li>
        <a onClick={exec(Logic.OpenLatestBox())}>
          {Intl.formatMessage(shared.intl, Messages.inbox)}
          {Router.isActive(shared.route, MailRoutes.Inbox) && " <---"}
        </a>
      </li>
      <li>
        <a onClick={exec(Logic.OpenSent())}>
          {Intl.formatMessage(shared.intl, Messages.sent)}
          {Router.isActive(shared.route, MailRoutes.Sent) && " <---"}
        </a>
      </li>
    </ul>
    {Router.whenRoute(shared.route, MailRoutes.Inbox, () =>
      nest(model.inbox, Inbox.View)
    )}
    {Router.whenRoute(shared.route, MailRoutes.Sent, () =>
      nest(model.sent, Sent.View)
    )}
  </div>;
