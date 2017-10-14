import React from "mangojuice-react";
import { Cmd } from "mangojuice-core";
import { MailRoutes } from "src/routes";
import * as Intl from "mangojuice-intl";
import * as Router from "mangojuice-router";
import * as Inbox from "mangojuice-lazy/loader!./Inbox";
import * as Sent from "mangojuice-lazy/loader!./Sent";


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
export const Logic = {
  name: "MailPage",

  children() {
    return {
      inbox: this.nest(Inbox.Logic),
      sent: this.nest(Sent.Logic)
    };
  },

  @Cmd.batch
  OpenLatestBox() {
    return MailRoutes.Inbox({
      box: this.shared.route.params.box || 0
    });
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

export const View = ({ model, shared }) =>
  <div>
    <ul>
      <li>
        <a onClick={Logic.OpenLatestBox}>
          {Intl.formatMessage(shared.intl, Messages.inbox)}
          {Router.isActive(shared.route, MailRoutes.Inbox) && " <---"}
        </a>
      </li>
      <li>
        <a onClick={Logic.OpenSent}>
          {Intl.formatMessage(shared.intl, Messages.sent)}
          {Router.isActive(shared.route, MailRoutes.Sent) && " <---"}
        </a>
      </li>
    </ul>
    {Router.isActive(shared.route, MailRoutes.Inbox) && <Inbox.View model={model.inbox} />}
    {Router.isActive(shared.route, MailRoutes.Sent) && <Sent.View model={model.sent} />}
  </div>
