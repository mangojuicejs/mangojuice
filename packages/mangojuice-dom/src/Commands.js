import { Task } from 'mangojuice-core';


export function focus(selector) {
  function focusTask(ctx, opts = {}) {
    return this.call(
      findDomNodes,
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
    return Task.execLatest(obj, name, descr);
  };
}
