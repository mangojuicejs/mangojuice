import { Cmd } from "mangojuice-core";

// Model
export type Model = {
  authorized: boolean,
  name: string
};

export const createModel = (): Model => ({
  authorized: false,
  name: ""
});

// Logic
export const Logic = {
  name: "User",

  config() {
    return {
      bindCommands: this
    };
  },

  @Cmd.update
  Login() {
    return {
      authorized: true,
      name: "Test User"
    };
  },

  @Cmd.update
  Logout() {
    return {
      authorized: false,
      name: ""
    };
  }
};
