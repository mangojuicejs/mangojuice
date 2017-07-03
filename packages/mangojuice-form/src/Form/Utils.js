export const getFormFieldModels = model => {
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

export const isSubmitting = model => model.state === "Submitting";

export const isInvalid = model => model.state === "Invalid";

export const isTyping = model => model.state === "Typing";

export const submitting = (model, fn) => isSubmitting(model) && fn();

export const invalid = (model, fn) => isInvalid(model) && fn();
