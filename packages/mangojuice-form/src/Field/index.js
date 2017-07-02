import { createModel } from './Model';
import { Logic } from './Logic';
import * as Tasks from './Tasks';
import * as Utils from './Utils';


export const handlers = (exec) => ({
  onChange: exec(Logic.HandleChange()),
  onFocus: exec(Logic.HandleFocus()),
  onBlur: exec(Logic.HandleBlur())
});

export default {
  ...Utils,
  handlers,
  createModel,
  Logic,
  Tasks
};
