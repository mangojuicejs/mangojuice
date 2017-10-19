import { Cmd, Task } from "mangojuice-core";
import Field from "../Field";
import * as Utils from "./Utils";

export const Logic = {
  name: "Form",

  config({ validateForm, submitForm } = {}) {
    return { meta: { validateForm, submitForm } };
  },

  // Others
  @Cmd.update
  SetFormState(state) {
    return { state };
  },

  @Cmd.batch
  ResetForm() {
    const fields = Utils.getFormFieldModels(this.model);
    return fields.map(f => Field.Logic.Reset().model(f));
  },

  @Cmd.batch
  TouchForm() {
    const fields = Utils.getFormFieldModels(this.model);
    return fields.map(f => Field.Logic.TouchField().model(f));
  },

  @Cmd.batch
  HandleField(cmd) {
    if (cmd.is(Field.Logic.HandleChange)) {
      return [
        Utils.isInvalid(this.model) && this.SetFormState("Typing")
        // isSubmitting(model) && cmd.Terminate() TODO
      ];
    }
  },

  // Validation
  @Cmd.batch
  ValidationSuccess() {
    if (Utils.isSubmitting(this.model)) {
      return this.DoSubmitForm();
    }
  },

  @Cmd.batch
  ValidationError() {
    return this.SetFormState("Invalid");
  },

  @Cmd.task
  ValidateForm() {
    return Task.create(this.meta.validateForm)
      .success(this.ValidationSuccess())
      .fail(this.ValidationError());
  },

  // Submit
  @Cmd.batch
  SubmitForm(e) {
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

  @Cmd.task
  DoSubmitForm() {
    return Task.create(this.meta.submitForm)
      .success(this.SubmitSuccess())
      .fail(this.SubmitFailed());
  }
};
