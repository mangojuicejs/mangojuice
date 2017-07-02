// @flow
import type { LogicObj } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import type { Model } from "./Model";
import * as Field from "@mangojuice/core/blocks/Field";
import * as Tasks from "./Tasks";
import { Dom } from "@mangojuice/core";
import * as Form from "@mangojuice/core/blocks/Form";

export const Logic: LogicObj<Model, SharedModel> = {
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
        title: nest(this.HandleField(), Field.Logic, {
          validator: x => (x.length < 10 ? "Title is too short" : ""),
          normalize: x => x.toUpperCase()
        }),
        article: nest(this.HandleField(), Field.Logic, {
          validator: x => (!x.length ? "Required" : "")
        }),
        category: nest(this.HandleField(), Field.Logic, {
          validator: x => (!x.length ? "Required" : "")
        }),
        tags: nest(this.HandleField(), Field.Logic, {
          valueSep: ",",
          validator: x => (!x.length ? "Required" : "")
        }),
        city: nest(this.HandleField(), Field.Logic, {
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

  @Dom.focus("#new-article-title") FocusForm() {}
};
