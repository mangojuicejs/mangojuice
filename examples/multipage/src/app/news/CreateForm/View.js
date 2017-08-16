import React from "mangojuice-react";
import * as Router from "mangojuice-router";
import * as Intl from "mangojuice-intl";
import * as Data from "mangojuice-data";
import { Field, Form } from "mangojuice-form";
import { Logic } from "./Logic";


export const Messages = {
  title: "NEWS.FORM.TITLE",
  article: "NEWS.FORM.ARTICLE",
  category: "NEWS.FORM.CATEGORY",
  city: "NEWS.FORM.CITY",
  tags: "NEWS.FORM.TAGS"
};

export const InputField = ({ model, shared, label }) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <input
      id={model.for}
      value={model.value}
      {...Field.handlers}
    />
    <label htmlFor={model.for}>
      {Intl.formatMessage(shared.intl, label)}
    </label>
  </div>;

export const TextareaField = ({ model, shared, label }) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <textarea
      id={model.for}
      value={model.value}
      {...Field.handlers}
    />
    <label htmlFor={model.for}>
      {Intl.formatMessage(shared.intl, label)}
    </label>
  </div>;

export const SelectField = ({ model, shared, label, options }) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <select
      id={model.for}
      value={model.value}
      {...Field.handlers}
    >
      <option>-- Select --</option>
      {options.map(o =>
        <option key={o.value} value={o.value}>
          {o.title}
        </option>
      )}
    </select>
    <label htmlFor={model.for}>
      {Intl.formatMessage(shared.intl, label)}
    </label>
  </div>;

export const AutocompleteField = ({ model, shared, label }) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    <input
      id={model.for}
      value={model.value.title || model.value}
      {...Field.handlers}
    />
    <label htmlFor={model.for}>
      {Intl.formatMessage(shared.intl, label)}
    </label>
    <AutocompleteSuggestions model={model.options} />
  </div>;

export const AutocompleteSuggestions = ({ model, shared }) =>
  <div>
    {Data.isError(model) && (
      <span>
        Error: {error}
      </span>
    )}
    {Data.isLoading(model) && <span>Loading...</span>}
    {Data.whenReady(model, list =>
      <ul>
        {list.map((s, i) =>
          <li key={i}>
            <a onMouseDown={Field.Logic.SelectOption(s)}>
              {s.title}
            </a>
          </li>
        )}
      </ul>
    )}
  </div>;

export const TagsField = ({ model, shared, label }) =>
  <div>
    {model.error &&
      model.touched &&
      <p>
        Field have error: {model.error}
      </p>}
    {Field.valueTail(model).map((x, i) =>
      <span key={i} onClick={Field.Logic.RemoveValuePart(i)}>
        {x},
      </span>
    )}
    <input
      id={model.for}
      value={Field.valueHead(model)}
      {...Field.handlers}
    />
    <label htmlFor={model.for}>
      {Intl.formatMessage(shared.intl, label)}
    </label>
  </div>;

export const View = ({ model, shared }) =>
  <form onSubmit={Logic.SubmitForm}>
    {Form.isInvalid(model) && <h2>Form is invalid. Check all fields please</h2>}
    <InputField
      model={model.title}
      label={Messages.title}
    />
    <TextareaField
      model={model.article}
      label={Messages.article}
    />
    <AutocompleteField
      model={model.city}
      label={Messages.city}
    />
    <SelectField
      model={model.category}
      label={Messages.category}
      options={[
        { value: "1", title: "World" },
        { value: "2", title: "Politics" },
        { value: "3", title: "Sport" }
      ]}
    />
    <TagsField
      model={model.tags}
      label={Messages.tags}
    />
    <button disabled={Form.isSubmitting(model)}>Submit</button>
    <a onClick={Logic.ResetForm}>Reset</a>
    <br />
  </form>;
