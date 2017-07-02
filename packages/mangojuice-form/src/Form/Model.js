export type Model = {
  state: "Typing" | "Submitting" | "Invalid"
};

export const createModel = (): Model => ({
  state: "Typing"
});
