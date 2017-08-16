import { Cmd } from "mangojuice-core";
import { MailRoutes } from "src/routes";
import * as Dom from "mangojuice-dom";
import * as Router from "mangojuice-router";
import * as Data from "mangojuice-data";
import * as Letter from "mangojuice-lazy/loader!../Letter";
import * as Tasks from "./Tasks";


export const getLettersIdnt = ({ route }) => {
  return `${route.params.box}`;
};

export const Logic = {
  name: "Inbox",

  config({ subscribe, nest, shared }) {
    return {
      subscriptions: subscribe(shared.route).handler(this.HandleRouter),
      children: {
        boxes: nest(Data.Logic).args({
          retreiver: Tasks.GetBoxesList
        }),
        letters: nest(Data.Logic).handler(this.HandleLetterData).args({
          retreiver: Tasks.GetBoxLetters,
          searcher: Tasks.GetSearchLetters,
          block: Letter
        })
      }
    };
  },

  @Cmd.batch
  HandleLetterData({ model }, cmd, cmdModel) {
    if (cmd.is(Letter.Logic.Delete)) {
      return Data.Logic.Filter(cmdModel).model(model.letters);
    }
  },

  @Cmd.batch
  HandleRouter({ shared, model }, cmd, route) {
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

  @Dom.focus("#search-letters")
  FocusSearchField() {
  },

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
