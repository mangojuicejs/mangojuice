// @flow
import type { LogicObj, ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import React from "react";
import LightboxMounter from "./mounter";
import { Cmd } from "@mangojuice/core";
import * as User from "src/shared/User";

// Model
export type Model = {};

export const createModel = (): Model => ({});

// Logic
export const Logic: LogicObj<Model, SharedModel> = {
  name: "LoginLightbox",

  config() {
    return {
      mounter: LightboxMounter
    };
  }
};

// View
export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  <div>
    <div>
      {!shared.user.authorized
        ? <button onClick={exec(User.Logic.Login())}>Log in</button>
        : <button onClick={exec(User.Logic.Logout())}>Log out</button>}
    </div>
  </div>;
