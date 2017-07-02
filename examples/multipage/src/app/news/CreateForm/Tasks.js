// @flow
import type { TaskFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import type { Model } from "./Model";
import { Utils, Task } from "@mangojuice/core";

export const GetCitySuggestions: TaskFn<Model, SharedModel> = function*(
  { model },
  val
) {
  return typeof val !== "string" || !val
    ? []
    : [
        { title: "New York" },
        { title: "Moskow" },
        { title: "Yekaterinburg" }
      ].filter(x => x.title.toLowerCase().indexOf(val.toLowerCase()) >= 0);
};

export const ValidateForm: TaskFn<Model, SharedModel> = function*({ model }) {
  if (
    model.title.valid &&
    model.article.valid &&
    model.category.valid &&
    model.tags.valid &&
    model.city.valid
  ) {
    return true;
  } else {
    throw new Error("The form is invalid");
  }
};

export const SubmitNewArticle: TaskFn<Model, SharedModel> = function*({
  model
}) {
  yield Task.call(Utils.delay, 2000);
  return {
    title: model.title.value,
    article: model.article.value,
    category: model.category.value,
    tags: model.tags.value,
    city: model.city.value
  };
};
