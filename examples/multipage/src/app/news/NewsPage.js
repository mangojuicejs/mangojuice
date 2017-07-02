// @flow
import type { LogicObj, ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import React from "react";
import * as Router from "@mangojuice/core/blocks/Router";
import * as Intl from "@mangojuice/core/blocks/Intl";
import { Cmd } from "@mangojuice/core";
import { Routes } from "src/routes";
import * as CreateForm from "@mangojuice/core/lazy!./CreateForm";

// Model
export type Model = {
  news: Array<any>,
  form: CreateForm.Model
};

export const createModel = (): Model => ({
  news: [],
  form: CreateForm.createModel()
});

// Logic
export const Logic: LogicObj<Model, SharedModel> = {
  name: "NewsPage",

  config({ subscribe, nest, shared }) {
    return {
      subscriptions: subscribe(this.HandleRouter(), shared.route),
      children: {
        form: nest(this.HandleForm(), CreateForm.Logic)
      }
    };
  },

  @Cmd.update
  AddNewArticle({ model }, article) {
    return { news: model.news.concat(article) };
  },

  @Cmd.handle
  HandleForm({ model }, cmd) {
    if (cmd.is(CreateForm.Logic.SubmitSuccess)) {
      return [
        CreateForm.Logic.ResetForm().model(model.form),
        this.AddNewArticle(cmd.args[0])
      ];
    }
  },

  @Cmd.batch
  HandleRouter({ shared, model }) {
    if (Router.isChanged(shared.route, Routes.News)) {
      return CreateForm.Logic.FocusForm().model(model.form);
    }
  }
};

// View
export const Messages = {
  title: "NEWS.TITLE",
  addArticle: "NEWS.ADD_ARTICLE",
  newsList: "NEWS.LIST"
};

export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec,
  all
}) =>
  <div>
    <h1>
      {Intl.formatMessage(shared.intl, Messages.title)}
    </h1>
    <FormView {...all} />
    <div>
      <h2>
        {Intl.formatMessage(shared.intl, Messages.newsList)}
      </h2>
    </div>
    <div>
      {model.news.map((a, i) =>
        <div key={i}>
          <h3>
            [{a.category}] {a.title}
          </h3>
          <p>
            {a.article}
          </p>
          <div>
            {a.tags.map(t =>
              <span>
                {t},{" "}
              </span>
            )}
          </div>
          <div>
            In {a.city.title}
          </div>
        </div>
      )}
    </div>
  </div>;

export const FormView: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  <div>
    <h2>
      {Intl.formatMessage(shared.intl, Messages.addArticle)}
    </h2>
    {nest(model.form, CreateForm.View)}
  </div>;
