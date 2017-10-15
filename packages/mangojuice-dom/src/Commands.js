import { Task, Cmd } from "mangojuice-core";
import * as Tasks from "./Tasks";

export function focus(selector) {
  function focusTask(ctx, opts = {}) {
    return this.call(
      Tasks.findDomNodes,
      selector,
      opts.attempts,
      opts.wait
    ).then(elems => {
      elems && elems[0].focus && elems[0].focus();
    });
  }
  function focusTaskCommand() {
    return Task.create(focusTask);
  }
  return function(obj, name, descr) {
    descr.value = focusTaskCommand;
    return Cmd.execLatest(obj, name, descr);
  };
}
