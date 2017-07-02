// @flow
import type { LogicObj } from "@mangojuice/core/types";
import type { Model as SharedModel } from "src/shared/Main";
import type { Model } from "./Model";
import { Cmd, Dom } from "@mangojuice/core";
import { MailRoutes } from "src/routes";
import * as Router from "@mangojuice/core/blocks/Router";
import * as Data from "@mangojuice/core/blocks/Data";
import * as Letter from "@mangojuice/core/lazy!../Letter";
import * as Tasks from "./Tasks";

export const getLettersIdnt = ({ route }) => {
  return `${route.params.box}`;
};

export const Logic: LogicObj<Model, SharedModel> = {
  name: "Inbox",

  config({ subscribe, nest, shared }) {
    return {
      subscriptions: subscribe(this.HandleRouter(), shared.route),
      children: {
        boxes: nest(null, Data.Logic, {
          retreiver: Tasks.GetBoxesList
        }),
        letters: nest(this.HandleLetterData(), Data.Logic, {
          retreiver: Tasks.GetBoxLetters,
          searcher: Tasks.GetSearchLetters,
          block: Letter
        })
      }
    };
  },

  @Cmd.handle
  HandleLetterData({ model }, cmd, cmdModel) {
    if (cmd.is(Letter.Logic.Delete)) {
      return Data.Logic.Filter(cmdModel).model(model.letters);
    }
  },

  @Cmd.batch
  HandleRouter({ shared, model }, route) {
    const result = [];
    if (Router.isActive(route, MailRoutes.Inbox)) {
      result.push(this.FocusSearchField());
      if (Data.isNotAsked(model.boxes)) {
        result.push(this.RetreiveBoxes());
      }
      if (Data.isDifferent(model.letters, getLettersIdnt(shared))) {
        result.push(this.RetreiveBoxLetters());
      }
    }
    if (Router.isLeft(route, MailRoutes.Inbox)) {
      result.push(Data.Logic.Cancel().model(model.boxes));
      result.push(Data.Logic.Cancel().model(model.letters));
    }
    return result;
  },

  @Dom.focus("#search-letters") FocusSearchField() {},

  @Cmd.batch
  RetreiveBoxLetters({ shared, model }) {
    return [
      Data.Logic.SetIdentifier(getLettersIdnt(shared)).model(model.letters),
      Data.Logic.Retreive().model(model.letters)
    ];
  },

  @Cmd.batch
  RetreiveBoxes({ model }) {
    return Data.Logic.Retreive().model(model.boxes);
  },

  @Cmd.batch
  OpenBox(ctx, box) {
    return MailRoutes.Inbox({ box });
  }
};
