export type Model = {
  params: { [key: string]: string },
  query: { [key: string]: string },
  active: { [key: string]: boolean },
  appearedOnce: { [key: string]: boolean },
  changedRoutes: { [key: string]: boolean },
  leftRoutes: { [key: string]: boolean }
};

export const createModel = () => ({
  params: {},
  query: {},
  active: {},
  appearedOnce: {},
  changedRoutes: {},
  leftRoutes: {}
});
