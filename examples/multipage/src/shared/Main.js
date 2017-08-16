import { Cmd } from "mangojuice-core";
import * as Router from "mangojuice-router";
import * as Intl from "mangojuice-intl";
import * as User from "./User";
import * as routes from "src/routes";
import languages from "src/languages";

// Model
export type Model = {
  intl: Intl.Model,
  route: Router.Model,
  user: User.Model
};

export const createModel = (): Model => ({
  intl: Intl.createModel(languages),
  route: Router.createModel(),
  user: User.createModel()
});


// Logic
export const Logic = {
  name: "Shared",

  config({ nest }, request) {
    return {
      bindCommands: this,
      children: {
        route: nest(Router.Logic).args(routes, request),
        intl: nest(Intl.Logic).args(languages),
        user: nest(User.Logic).args(request)
      }
    };
  }
};
