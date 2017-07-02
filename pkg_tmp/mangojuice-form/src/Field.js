// @flow
import type { LogicFn, CmdsObj } from "../types";
import { Cmd, Task, Utils } from "../";
import * as Data from "./Data";

// Model
export type Model<T> = {
  state: "Typing" | "Validating",
  error: string,
  value: T,
  initialValue: T,
  for: string,
  touched: boolean,
  valid: boolean,
  focused: boolean,
  options: Data.Model<any>,
  __field: boolean
};

export const createModel = <T>(initialValue: T, forId?: string): Model<T> => ({
  initialValue,
  state: "Typing",
  error: "",
  value: initialValue,
  focused: false,
  valid: false,
  for: forId || `field_${Utils.nextId()}`,
  touched: false,
  options: Data.createModel(),
  __field: true
});

// Commands
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
        options: nest(this.HandleOption(), Data.Logic, {
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
  @Cmd.handle
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
    return Data.Logic.Retreive(valueHead(model)).model(model.options);
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
    return Task.create(validatorTask)
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
    const val = e && e.target ? e.target.value : e;
    let nextVal = val;
    if (meta.valueSep || meta.multiselect) {
      if (typeof val === "string") {
        if (meta.valueSep && val.endsWith(meta.valueSep)) {
          const sep = meta.valueSep;
          const finalVal = val.substr(0, val.length - sep.length);
          nextVal = valueTail(model).concat(finalVal, "");
        } else {
          nextVal = valueTail(model).concat(val);
        }
      } else {
        nextVal = valueTail(model).concat(val, "");
      }
    }
    return { value: meta.normalize(nextVal) };
  },

  @Cmd.update
  RemoveValuePart({ model }, valueIndex) {
    return {
      value: valueTail(model)
        .filter((x, i) => i !== valueIndex)
        .concat(valueHead(model))
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

// Internal tasks
export async function validatorTask({ meta, model }) {
  return await this.call(meta.validator, model.value);
}

// Utils
export const handlers = (exec: (cmd: Cmd.Cmd<Model<*>, *>) => Function) => ({
  onChange: exec(Logic.HandleChange()),
  onFocus: exec(Logic.HandleFocus()),
  onBlur: exec(Logic.HandleBlur())
});

export const valueHead = <T>(
  model: Model<Array<T>>,
  defaultVal: T | string = ""
): T => {
  return Array.isArray(model.value)
    ? model.value[model.value.length - 1] || defaultVal
    : model.value;
};

export const valueTail = <T>(model: Model<Array<T>>): Array<T> => {
  return Array.isArray(model.value)
    ? model.value.slice(0, model.value.length - 1)
    : [];
};
