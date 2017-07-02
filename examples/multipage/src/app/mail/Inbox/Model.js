// @flow
import type { Model as DataModel } from "@mangojuice/core/blocks/Data";
import type { Model as LetterModel } from "../Letter";
import * as Data from "@mangojuice/core/blocks/Data";

export type Box = {
  id: string,
  title: string
};

export type Model = {
  boxes: DataModel<Array<Box>>,
  letters: DataModel<Array<LetterModel>>
};

export const createModel = (): Model => ({
  boxes: Data.createModel(),
  letters: Data.createModel()
});
