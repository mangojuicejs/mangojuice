// @flow
import type { ViewFn } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import type { Model, Box } from "./Model";
import React from "react";
import * as Data from "@mangojuice/core/blocks/Data";
import * as Intl from "@mangojuice/core/blocks/Intl";
import * as Letter from "@mangojuice/core/lazy!../Letter";
import { Logic } from "./Logic";

export const Messages = {
  boxes: "MAIL.INBOX.BOXES_TITLE",
  letters: "MAIL.INBOX.LETTERS_TITLE"
};

export const BoxesList: ViewFn<Data.Model<Array<Box>>, SharedModel> = ({
  model,
  shared,
  exec
}) =>
  <ul>
    {Data.whenError(model, error =>
      <span>
        Error: {error}
      </span>
    )}
    {Data.whenLoading(model, () => <span>Loading...</span>)}
    {Data.whenReady(model, list =>
      list.map(box =>
        <li key={box.id}>
          <a onClick={exec(Logic.OpenBox(box.id))}>
            {box.title}
            {shared.route.params.box === box.id && " <---"}
          </a>
        </li>
      )
    )}
  </ul>;

export const LettersList: ViewFn<
  Data.Model<Array<Letter.Model>>,
  SharedModel
> = ({ model, nest, exec }) =>
  <div>
    <div>
      <input
        id="search-letters"
        placeholder="Search..."
        value={model.query}
        onChange={exec(Data.Logic.Search())}
      />
    </div>
    {Data.whenError(model, error =>
      <span>
        Error: {error}
      </span>
    )}
    {Data.whenLoading(model, () => <span>Loading...</span>)}
    {Data.whenReady(model, data => data.map(l => nest(l, Letter.View)))}
  </div>;

export const View: ViewFn<Model, SharedModel> = ({
  model,
  shared,
  nest,
  exec
}) =>
  <div>
    <div>
      <h1>
        {Intl.formatMessage(shared.intl, Messages.boxes)}
      </h1>
      {nest(model.boxes, BoxesList)}
    </div>
    <div>
      <h2>
        {Intl.formatMessage(shared.intl, Messages.letters)}
      </h2>
      {nest(model.letters, LettersList)}
    </div>
  </div>;
