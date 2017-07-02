export const getFormFieldModels = (model) => {
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

export const isSubmitting = (model: Model) => model.state === 'Submitting';

export const isInvalid = (model: Model) => model.state === 'Invalid';

export const isTyping = (model: Model) => model.state === 'Typing';

export const submitting = (model: Model, fn: Function) =>
  isSubmitting(model) && fn();

export const invalid = (model: Model, fn: Function) => isInvalid(model) && fn();
