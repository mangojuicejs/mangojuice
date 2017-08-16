import { Utils, Task } from "mangojuice-core";


export async function GetCitySuggestions({ model }, val) {
  return typeof val !== "string" || !val
    ? []
    : [
        { title: "New York" },
        { title: "Moskow" },
        { title: "Yekaterinburg" }
      ].filter(x => x.title.toLowerCase().indexOf(val.toLowerCase()) >= 0);
};

export async function ValidateForm({ model }) {
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

export async function SubmitNewArticle({ model }) {
  await this.call(Task.delay, 2000);
  return {
    title: model.title.value,
    article: model.article.value,
    category: model.category.value,
    tags: model.tags.value,
    city: model.city.value
  };
};
