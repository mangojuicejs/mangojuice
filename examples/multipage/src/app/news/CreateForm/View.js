// @flow
import type { ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import type { Model } from "./Model";
import React from "react";
import * as Router from "@mangojuice/core/blocks/Router";
import * as Intl from "@mangojuice/core/blocks/Intl";
import * as Form from "@mangojuice/core/blocks/Form";
import * as Data from "@mangojuice/core/blocks/Data";
import * as Field from "@mangojuice/core/blocks/Field";
import { Logic } from "./Logic";

export const Messages = {
  title: "NEWS.FORM.TITLE",
  article: "NEWS.FORM.ARTICLE",
  category: "NEWS.FORM.CATEGORY",
  city: "NEWS.FORM.CITY",
  tags: "NEWS.FORM.TAGS"
};

export const InputField: ViewFn<Field.Model<string>, SharedModel> = ({
  model,
  props,
  exec
}) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <input
      id={model.for}
      value={model.value}
      disabled={props.disabled}
      {...Field.handlers(exec)}
    />
    <label htmlFor={model.for}>
      {props.label}
    </label>
  </div>;

export const TextareaField: ViewFn<Field.Model<string>, SharedModel> = ({
  model,
  props,
  exec
}) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <textarea
      id={model.for}
      value={model.value}
      disabled={props.disabled}
      {...Field.handlers(exec)}
    />
    <label htmlFor={model.for}>
      {props.label}
    </label>
  </div>;

export const SelectField: ViewFn<Field.Model<string>, SharedModel> = ({
  model,
  props,
  exec
}) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <select
      id={model.for}
      value={model.value}
      disabled={props.disabled}
      {...Field.handlers(exec)}
    >
      <option>-- Select --</option>
      {props.options.map(o =>
        <option key={o.value} value={o.value}>
          {o.title}
        </option>
      )}
    </select>
    <label htmlFor={model.for}>
      {props.label}
    </label>
  </div>;

export const AutocompleteField: ViewFn<Field.Model<string>, SharedModel> = ({
  model,
  nest,
  exec,
  props
}) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <input
      id={model.for}
      disabled={props.disabled}
      value={model.value.title || model.value}
      {...Field.handlers(exec)}
    />
    <label htmlFor={model.for}>
      {props.label}
    </label>
    {nest(model.options, AutocompleteSuggestions)}
  </div>;

export const AutocompleteSuggestions: ViewFn<
  Data.Model<Array<any>>,
  SharedModel
> = ({ model, exec }) =>
  <div>
    {Data.whenError(model, error =>
      <span>
        Error: {error}
      </span>
    )}
    {Data.whenLoading(model, () => <span>Loading...</span>)}
    {Data.whenReady(model, list =>
      <ul>
        {list.map((s, i) =>
          <li key={i}>
            <a onMouseDown={exec(Field.Logic.SelectOption(s))}>
              {s.title}
            </a>
          </li>
        )}
      </ul>
    )}
  </div>;

export const TagsField: ViewFn<Field.Model<Array<string>>, SharedModel> = ({
  model,
  nest,
  exec,
  props
}) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    {Field.valueTail(model).map((x, i) =>
      <span key={i} onClick={exec(Field.Logic.RemoveValuePart(i))}>
        {x},
      </span>
    )}
    <input
      id={model.for}
      disabled={props.disabled}
      value={Field.valueHead(model)}
      {...Field.handlers(exec)}
    />
    <label htmlFor={model.for}>
      {props.label}
    </label>
  </div>;

export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  <form onSubmit={exec(Logic.SubmitForm())}>
    {Form.isInvalid(model) && <h2>Form is invalid. Check all fields please</h2>}
    {nest(model.title, InputField, {
      label: Intl.formatMessage(shared.intl, Messages.title),
      disabled: Form.isSubmitting(model)
    })}
    {nest(model.article, TextareaField, {
      label: Intl.formatMessage(shared.intl, Messages.article),
      disabled: Form.isSubmitting(model)
    })}
    {nest(model.city, AutocompleteField, {
      label: Intl.formatMessage(shared.intl, Messages.city),
      disabled: Form.isSubmitting(model)
    })}
    {nest(model.category, SelectField, {
      label: Intl.formatMessage(shared.intl, Messages.category),
      disabled: Form.isSubmitting(model),
      options: [
        { value: "1", title: "World" },
        { value: "2", title: "Politics" },
        { value: "3", title: "Sport" }
      ]
    })}
    {nest(model.tags, TagsField, {
      label: Intl.formatMessage(shared.intl, Messages.tags),
      disabled: Form.isSubmitting(model)
    })}
    <button disabled={Form.isSubmitting(model)}>Submit</button>
    <a onClick={exec(Logic.ResetForm())}>Reset</a>
    <br />
  </form>;
