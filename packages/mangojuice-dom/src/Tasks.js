import { Task } from 'mangojuice-core';
import * as Utils from './Utils';


export function findDomNodes(selector, attempts = 100, wait = 50) {
  if (!Utils.isWindowDefined) {
    return null;
  }

  const newAttempt = attempts - 1;
  if (newAttempt >= 0) {
    const elems = Utils.querySelector(selector);
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
