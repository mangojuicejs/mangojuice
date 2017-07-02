import { execLatest } from "./Cmd";
import * as Task from "./Task";

// Utils
export const isWindowDefined =
  typeof document !== "undefined" && document.querySelectorAll;

export const querySelector = selector => document.querySelectorAll(selector);

export function findDomNodes(selector, attempts = 100, wait = 50) {
  if (!isWindowDefined) {
    return null;
  }

  const newAttempt = attempts - 1;
  if (newAttempt >= 0) {
    const elems = querySelector(selector);
    if (!elems.length) {
      return this.call(Task.delay, wait).then(() => {
        return this.call(findDomNodes, newAttempt, wait);
      });
    } else {
      return elems;
    }
  }
  return null;
}

// Commands
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
    return execLatest(obj, name, descr);
  };
}
