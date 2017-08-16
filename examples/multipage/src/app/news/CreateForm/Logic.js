import { Cmd } from "mangojuice-core";
import * as Dom from "mangojuice-dom";
import { Form, Field } from "mangojuice-form";
import * as Tasks from "./Tasks";


export const Logic = {
  ...Form.Logic,
  name: "CreateForm",

  config(props) {
    const { nest } = props;
    const formConfig = Form.Logic.config(props, {
      validateForm: Tasks.ValidateForm,
      submitForm: Tasks.SubmitNewArticle
    });
    return {
      ...formConfig,
      children: {
        title: nest(Field.Logic).handler(this.HandleField).args({
          validator: x => (x.length < 10 ? "Title is too short" : ""),
          normalize: x => x.toUpperCase()
        }),
        article: nest(Field.Logic).handler(this.HandleField).args({
          validator: x => (!x.length ? "Required" : "")
        }),
        category: nest(Field.Logic).handler(this.HandleField).args({
          validator: x => (!x.length ? "Required" : "")
        }),
        tags: nest(Field.Logic).handler(this.HandleField).args({
          valueSep: ",",
          validator: x => (!x.length ? "Required" : "")
        }),
        city: nest(Field.Logic).handler(this.HandleField).args({
          optionsGetter: Tasks.GetCitySuggestions,
          validator: x => {
            if (!x) {
              return "Required";
            } else if (!x.title) {
              return "You should select some city";
            }
          }
        })
      }
    };
  },

  @Dom.focus("#new-article-title")
  FocusForm() {
  },

  @Cmd.batch
  SubmitFailed(ctx, error) {
    console.error(error)
  }
};
