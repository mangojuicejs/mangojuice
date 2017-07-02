// @flow
import type { LogicFn, CmdsObj } from "../types";
import { Cmd, Task } from "../";
import * as Field from "./Field";

// Model
export type Model = {
  state: "Typing" | "Submitting" | "Invalid"
};

export const createModel = (): Model => ({
  state: "Typing"
});

// Logic
export const Logic = {
  name: "Form",

  config(ctx, { validateForm, submitForm } = {}) {
    return { meta: { validateForm, submitForm } };
  },

  // Others
  @Cmd.update
  SetFormState(ctx, state) {
    return { state };
  },

  @Cmd.batch
  ResetForm({ model }) {
    const fields = getFormFieldModels(model);
    return fields.map(f => Field.Logic.Reset().model(f));
  },

  @Cmd.batch
  TouchForm({ model }) {
    const fields = getFormFieldModels(model);
    return fields.map(f => Field.Logic.TouchField().model(f));
  },

  @Cmd.handle
  HandleField({ model }, cmd) {
    if (cmd.is(Field.Logic.HandleChange)) {
      return [
        isInvalid(model) && this.SetFormState("Typing")
        // isSubmitting(model) && cmd.Terminate() TODO
      ];
    }
  },

  // Validation
  @Cmd.batch
  ValidationSuccess({ model }) {
    if (isSubmitting(model)) {
      return this.DoSubmitForm();
    }
  },

  @Cmd.batch
  ValidationError() {
    return this.SetFormState("Invalid");
  },

  @Cmd.execLatest
  ValidateForm({ meta }) {
    return Task.create(meta.validateForm)
      .success(this.ValidationSuccess())
      .fail(this.ValidationError());
  },

  // Submit
  @Cmd.batch
  SubmitForm(ctx, e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    return [
      this.SetFormState("Submitting"),
      this.TouchForm(),
      this.ValidateForm()
    ];
  },

  @Cmd.batch
  SubmitSuccess() {
    return this.SetFormState("Typing");
  },

  @Cmd.nope SubmitFailed() {},

  @Cmd.execLatest
  DoSubmitForm({ meta }) {
    return Task.create(meta.submitForm)
      .success(this.SubmitSuccess())
      .fail(this.SubmitFailed());
  }
};

// Utils
export const getFormFieldModels = (model: Object): Array<Field.Model<*>> => {
  const isFieldModel = f => f && f.__field;
  return Object.keys(model).reduce((acc, k) => {
    if (Array.isArray(model[k]) && isFieldModel(model[k][0])) {
      return [...acc, ...model[k]];
    } else if (isFieldModel(model[k])) {
      return [...acc, model[k]];
    }
    return acc;
  }, []);
};

export const isSubmitting = (model: Model) => model.state === "Submitting";

export const isInvalid = (model: Model) => model.state === "Invalid";

export const isTyping = (model: Model) => model.state === "Typing";

export const submitting = (model: Model, fn: Function) =>
  isSubmitting(model) && fn();

export const invalid = (model: Model, fn: Function) => isInvalid(model) && fn();
