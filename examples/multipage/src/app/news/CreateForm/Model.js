// @flow
import * as Field from "@mangojuice/core/blocks/Field";
import * as Form from "@mangojuice/core/blocks/Form";

export type Model = Form.Model & {
  title: Field.Model<string>,
  article: Field.Model<string>,
  category: Field.Model<string>,
  tags: Field.Model<Array<string>>,
  city: Field.Model<string>
};

export const createModel = (): Model => ({
  ...Form.createModel(),
  title: Field.createModel("", "new-article-title"),
  article: Field.createModel(""),
  category: Field.createModel(""),
  tags: Field.createModel([]),
  city: Field.createModel("")
});
