import React from "mangojuice-react";
import * as Data from "mangojuice-data";
import * as Intl from "mangojuice-intl";
import * as Letter from "mangojuice-lazy/loader!../Letter";
import { Logic } from "./Logic";


export const Messages = {
  boxes: "MAIL.INBOX.BOXES_TITLE",
  letters: "MAIL.INBOX.LETTERS_TITLE"
};

export const BoxesList = ({ model, shared }) =>
  <ul>
    {Data.isError(model) && (
      <span>
        Error: {error}
      </span>
    )}
    {Data.isLoading(model) && <span>Loading...</span>}
    {Data.whenReady(model, list =>
      list.map(box =>
        <li key={box.id}>
          <a onClick={Logic.OpenBox(box.id)}>
            {box.title}
            {shared.route.params.box === box.id && " <---"}
          </a>
        </li>
      )
    )}
  </ul>;

export const LettersList = ({ model, nest }) =>
  <div>
    <div>
      <input
        id="search-letters"
        placeholder="Search..."
        value={model.query}
        onChange={Data.Logic.Search}
      />
    </div>
    {Data.isError(model) && (
      <span>
        Error: {error}
      </span>
    )}
    {Data.isLoading(model) && <span>Loading...</span>}
    {Data.whenReady(model, data => data.map(l => <Letter.View model={l} />))}
  </div>;

export const View = ({ model, shared }) =>
  <div>
    <div>
      <h1>
        {Intl.formatMessage(shared.intl, Messages.boxes)}
      </h1>
      <BoxesList model={model.boxes} />
    </div>
    <div>
      <h2>
        {Intl.formatMessage(shared.intl, Messages.letters)}
      </h2>
      <LettersList model={model.letters} />
    </div>
  </div>;
