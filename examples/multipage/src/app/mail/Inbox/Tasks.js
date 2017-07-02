// @flow
import type { TaskFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import type { Model, Box } from "./Model";
import * as Data from "@mangojuice/core/blocks/Data";
import * as Letter from "@mangojuice/core/lazy!../Letter";
import { Utils, Task } from "@mangojuice/core";

export const GetBoxesList: TaskFn<Model, SharedModel> = function*() {
  yield Task.call(Utils.delay, 2000);
  const data = yield Task.call(_getBoxesList);
  return data;
};

export const GetBoxLetters: TaskFn<Model, SharedModel> = function*({ shared }) {
  yield Task.call(Utils.delay, 2000);
  const data = yield Task.call(_getMailsList, shared.route.params.box);
  return data.map(l => Letter.createModel(l));
};

export const GetSearchLetters: TaskFn<
  Data.Model<Letter.Model>,
  SharedModel
> = function*({ model }, data: Array<Letter.Model>) {
  yield Task.call(Utils.delay, 300);
  return data.reduce((acc, x, i) => {
    if (
      !model.query ||
      x.text.toLowerCase().indexOf(model.query) >= 0 ||
      x.title.toLowerCase().indexOf(model.query) >= 0
    ) {
      acc.push(i);
    }
    return acc;
  }, []);
};

export const _getBoxesList = () => {
  return Promise.resolve([
    { id: "0", title: "Box 1" },
    { id: "1", title: "Box 2" },
    { id: "2", title: "Box 3" },
    { id: "3", title: "Box 4" }
  ]);
};

export const _getMailsList = (boxId: string) => {
  return Promise.resolve([
    { title: `${boxId} mail 1`, text: "Letter 1" },
    { title: `${boxId} mail 2`, text: "Letter 2" },
    { title: `${boxId} mail 3`, text: "Letter 3" },
    { title: `${boxId} mail 4`, text: "Letter 4" }
  ]);
};
