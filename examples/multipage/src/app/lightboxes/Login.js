import React from "react";
import LightboxMounter from "./mounter";
import { Cmd } from "mangojuice-core";
import * as User from "src/shared/User";

// Model
export type Model = {};
export const createModel = (): Model => ({});

// Logic
export const Logic = {
  name: "LoginLightbox",

  config() {
    return {
      mounter: LightboxMounter
    };
  }
};

// View
export const View = ({ model, shared }) =>
  <div>
    <div>
      {!shared.user.authorized
        ? <button onClick={User.Logic.Login}>Log in</button>
        : <button onClick={User.Logic.Logout}>Log out</button>}
    </div>
  </div>;
