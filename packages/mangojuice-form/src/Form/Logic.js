import { Cmd, Task } from "mangojuice-core";
import Field from "../Field";
import * as Utils from "./Utils";

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
    const fields = Utils.getFormFieldModels(model);
    return fields.map(f => Field.Logic.Reset().model(f));
  },

  @Cmd.batch
  TouchForm({ model }) {
    const fields = Utils.getFormFieldModels(model);
    return fields.map(f => Field.Logic.TouchField().model(f));
  },

  @Cmd.batch
  HandleField({ model }, cmd) {
    if (cmd.is(Field.Logic.HandleChange)) {
      return [
        Utils.isInvalid(model) && this.SetFormState("Typing")
        // isSubmitting(model) && cmd.Terminate() TODO
      ];
    }
  },

  // Validation
  @Cmd.batch
  ValidationSuccess({ model }) {
    if (Utils.isSubmitting(model)) {
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
