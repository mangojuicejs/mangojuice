// @flow
import type { LogicObj, ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import React from "react";
import { Cmd } from "@mangojuice/core";
import * as Intl from "@mangojuice/core/blocks/Intl";

// Model
export type Model = {
  title: string,
  text: string
};

export const createModel = (letter: Model): Model => ({
  title: letter.title,
  text: letter.text
});

// Logic
export const Logic: LogicObj<Model, SharedModel> = {
  name: "Letter",

  config({ shared, subscribe }) {
    return {
      subscriptions: subscribe(this.SubSmth(), shared.intl)
    };
  },

  port({ destroy }) {
    destroy.then(() => console.log("port destroyed"));
  },

  @Cmd.nope Delete() {},

  @Cmd.nope SubSmth() {}
};

// View
export const Messages = {
  delete: "MAIL.LETTER.DELETE"
};

export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  <div>
    <h3>
      {model.title}
    </h3>
    <p>
      {model.text}
    </p>
    {shared.user.authorized &&
      <div>
        <button onClick={exec(Logic.Delete())}>
          {Intl.formatMessage(shared.intl, Messages.delete)}
        </button>
      </div>}
  </div>;
