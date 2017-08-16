import React from "react";
import * as Router from "mangojuice-router";
import * as Intl from "mangojuice-intl";
import { Cmd } from "mangojuice-core";
import { Routes } from "src/routes";
import * as CreateForm from "mangojuice-lazy/loader!./CreateForm";

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
export const Logic = {
  name: "NewsPage",

  config({ subscribe, nest, shared }) {
    return {
      subscriptions: subscribe(shared.route).handler(this.HandleRouter),
      children: {
        form: nest(CreateForm.Logic).handler(this.HandleForm)
      }
    };
  },

  @Cmd.update
  AddNewArticle({ model }, article) {
    return { news: model.news.concat(article) };
  },

  @Cmd.batch
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

export const View = ({ model, shared }) =>
  <div>
    <h1>
      {Intl.formatMessage(shared.intl, Messages.title)}
    </h1>
    <FormView model={model} />
    <div>
      <h2>
        {Intl.formatMessage(shared.intl, Messages.newsList)}
      </h2>
    </div>
    <NewsListView model={model} />
  </div>;

export const NewsListView = ({ model, shared }) =>
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
          {a.tags.map((t, i) =>
            <span key={i}>
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

export const FormView = ({ model, shared }) =>
  <div>
    <h2>
      {Intl.formatMessage(shared.intl, Messages.addArticle)}
    </h2>
    <CreateForm.View model={model.form} />
  </div>;
