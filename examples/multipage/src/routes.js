import { route } from "@mangojuice/core/blocks/Router";

export const MailRoutes = {
  name: "MailRoutes",
  Inbox: route("/inbox(/:box)"),
  Sent: route("/sent")
};

export const Routes = {
  name: "IndexRoutes",
  News: route("/news", null, { default: true }),
  Mail: route("/mail", MailRoutes)
};
