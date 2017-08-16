import React from "mangojuice-react";
import { Cmd } from "mangojuice-core";
import * as Intl from "mangojuice-intl";


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
export const Logic = {
  name: "Letter",

  config({ shared, subscribe }) {
    return {
      subscriptions: subscribe(shared.intl).handler(this.SubSmth)
    };
  },

  port({ destroy }) {
    destroy.then(() => console.log("port destroyed"));
  },

  @Cmd.nope
  Delete() {},

  @Cmd.nope
  SubSmth() {}
};

// View
export const Messages = {
  delete: "MAIL.LETTER.DELETE"
};

export const View = ({ model, shared }) =>
  <div>
    <h3>
      {model.title}
    </h3>
    <p>
      {model.text}
    </p>
    {shared.user.authorized && (
      <div>
        <button onClick={Logic.Delete}>
          {Intl.formatMessage(shared.intl, Messages.delete)}
        </button>
      </div>
    )}
  </div>;
