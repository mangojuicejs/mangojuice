import { Cmd } from "mangojuice-core";
import * as Dom from "mangojuice-dom";
import { Form, Field } from "mangojuice-form";
import * as Tasks from "./Tasks";


export const Logic = {
  ...Form.Logic,
  name: "CreateForm",

  config() {
    return Form.Logic.config({
      validateForm: Tasks.ValidateForm,
      submitForm: Tasks.SubmitNewArticle
    });
  },

  children() {
    return {
      title: this.nest(Field.Logic).handler(this.HandleField).args({
        validator: x => (x.length < 10 ? "Title is too short" : ""),
        normalize: x => x.toUpperCase()
      }),
      article: this.nest(Field.Logic).handler(this.HandleField).args({
        validator: x => (!x.length ? "Required" : "")
      }),
      category: this.nest(Field.Logic).handler(this.HandleField).args({
        validator: x => (!x.length ? "Required" : "")
      }),
      tags: this.nest(Field.Logic).handler(this.HandleField).args({
        valueSep: ",",
        validator: x => (!x.length ? "Required" : "")
      }),
      city: this.nest(Field.Logic).handler(this.HandleField).args({
        optionsGetter: Tasks.GetCitySuggestions,
        validator: x => {
          if (!x) {
            return "Required";
          } else if (!x.title) {
            return "You should select some city";
          }
        }
      })
    };
  },

  @Dom.focus("#new-article-title")
  FocusForm() {
  },

  @Cmd.batch
  SubmitFailed(error) {
    console.error(error)
  }
};
