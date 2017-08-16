import * as Letter from "../Letter";
import * as Data from "mangojuice-data";

export type Box = {
  id: string,
  title: string
};

export type Model = {
  boxes: Data.Model<Array<Box>>,
  letters: Data.Model<Array<Letter.Model>>
};

export const createModel = (): Model => ({
  boxes: Data.createModel(),
  letters: Data.createModel()
});
