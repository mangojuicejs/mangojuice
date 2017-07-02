// @flow
import type { LogicObj } from "@mangojuice/core/types";
import { Cmd } from "@mangojuice/core";
import * as Router from "@mangojuice/core/blocks/Router";
import * as Intl from "@mangojuice/core/blocks/Intl";
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
export const Logic: LogicObj<Model, any> = {
  name: "Shared",

  config({ nest }, request) {
    return {
      bindCommands: this,
      children: {
        route: nest(null, Router.Logic, routes, request),
        intl: nest(null, Intl.Logic, languages),
        user: nest(null, User.Logic, request)
      }
    };
  }
};
