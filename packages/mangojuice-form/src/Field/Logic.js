import Data from "mangojuice-data";
import { Cmd, Task } from "mangojuice-core";
import * as Tasks from "./Tasks";
import * as Utils from "./Utils";

// Logic
export const Logic = {
  name: "Field",

  config({ nest }, opts = {}) {
    const meta = {
      ...opts,
      normalize: opts.normalize || (x => x),
      validator: opts.validator || (() => true)
    };
    return {
      meta,
      initCommands: this.InitField(),
      children: {
        options: nest(Data.Logic).handler(this.HandleOption).args({
          retreiver: meta.optionsGetter
        })
      }
    };
  },

  @Cmd.update
  SelectOption(ctx, option, event) {
    if (event && event.preventDefault && event.stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
  },

  // Options
  @Cmd.batch
  HandleOption(ctx, cmd) {
    if (cmd.is(this.SelectOption)) {
      return [
        this.SetFieldValue(cmd.args[0]),
        this.LoadOptions(),
        this.Validate()
      ];
    }
  },

  @Cmd.batch
  LoadOptions({ model }) {
    return Data.Logic
      .Retreive(Utils.valueHead(model), model)
      .model(model.options);
  },

  // Validation
  @Cmd.update
  ValidationFinished(ctx, error) {
    return {
      state: "Typing",
      error: (error && error.message) || error,
      valid: !error
    };
  },

  @Cmd.execLatest
  ValidationStart() {
    return Task.create(Tasks.validatorTask)
      .success(this.ValidationFinished())
      .fail(this.ValidationFinished());
  },

  @Cmd.update
  SetValidationState() {
    return { state: "Validating" };
  },

  @Cmd.batch
  Validate() {
    return [this.SetValidationState(), this.ValidationStart()];
  },

  // Resetting
  @Cmd.update
  SetInitialValue({ model }) {
    return {
      value: model.initialValue,
      touched: false
    };
  },

  @Cmd.batch
  Reset() {
    return [this.SetInitialValue(), this.Validate()];
  },

  // Field change handling
  @Cmd.update
  SetFieldValue({ meta, model }, e) {
    const val = e && e.target ? e.target.files || e.target.value : e;
    const valueSep = Utils.resolve(meta.valueSep, model);
    const emptyValue = Utils.resolve(meta.emptyValue, model);
    const multiselect = Utils.resolve(meta.multiselect, model);
    let nextVal = val;

    if (valueSep || multiselect) {
      if (typeof val === "string") {
        if (valueSep && val.endsWith(valueSep)) {
          const sep = valueSep;
          const finalVal = val.substr(0, val.length - sep.length);
          nextVal = Utils.valueTail(model).concat(finalVal, emptyValue || '');
        } else {
          nextVal = Utils.valueTail(model).concat(val);
        }
      } else {
        nextVal = Utils.valueTail(model).concat(val, emptyValue);
      }
    }
    return { value: meta.normalize(nextVal, model) };
  },

  @Cmd.update
  RemoveValuePart({ model }, valueIndex) {
    return {
      value: Utils.valueTail(model)
        .filter((x, i) => i !== valueIndex)
        .concat(Utils.valueHead(model))
    };
  },

  @Cmd.update
  TouchField() {
    return {
      focused: false,
      touched: true
    };
  },

  @Cmd.batch
  HandleChange({ meta }, e) {
    return [
      this.SetFieldValue(e),
      this.Validate(),
      meta.optionsGetter && this.LoadOptions()
    ];
  },

  @Cmd.batch
  HandleBlur() {
    return [this.TouchField(), this.Validate()];
  },

  @Cmd.update
  HandleFocus() {
    return { focused: true };
  },

  @Cmd.batch
  InitField({ meta, model }) {
    const loadOptions = meta.optionsGetter && Data.isNotAsked(model.options);
    return [loadOptions && this.LoadOptions(), this.Validate()];
  }
};
