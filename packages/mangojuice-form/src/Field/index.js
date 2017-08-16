import { createModel } from "./Model";
import { Logic } from "./Logic";
import * as Tasks from "./Tasks";
import * as Utils from "./Utils";

export const handlers = {
  onChange: Logic.HandleChange,
  onFocus: Logic.HandleFocus,
  onBlur: Logic.HandleBlur
};

export default { ...Utils, handlers, createModel, Logic, Tasks };
