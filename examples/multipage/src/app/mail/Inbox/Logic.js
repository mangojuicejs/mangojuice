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

  children({ nest }) {
    return {
      boxes: nest(Data.Logic).args({
        retreiver: Tasks.GetBoxesList
      }),
      letters: nest(Data.Logic).handler(this.HandleLetterData).args({
        retreiver: Tasks.GetBoxLetters,
        searcher: Tasks.GetSearchLetters,
        block: Letter
      })
    };
  },

  port({ exec, shared, destroy }) {
    Utils.handleModelChanges(shared.route, () => exec(this.HandleRouter()), destroy);
    return exec(this.HandleRouter());
  },

  @Cmd.batch
  HandleLetterData(cmd, cmdModel) {
    if (cmd.is(Letter.Logic.Delete)) {
      return Data.Logic.Filter(cmdModel).model(this.model.letters);
    }
  },

  @Cmd.batch
  HandleRouter(cmd, route) {
    const result = [];
    if (Router.isActive(route, MailRoutes.Inbox)) {
      result.push(this.FocusSearchField());
      if (Data.isNotAsked(this.model.boxes)) {
        result.push(this.RetreiveBoxes());
      }
      if (Data.isDifferent(this.model.letters, getLettersIdnt(this.shared))) {
        result.push(this.RetreiveBoxLetters());
      }
    }
    if (Router.isLeft(route, MailRoutes.Inbox)) {
      result.push(Data.Logic.Cancel().model(this.model.boxes));
      result.push(Data.Logic.Cancel().model(this.model.letters));
    }
    return result;
  },

  @Dom.focus("#search-letters")
  FocusSearchField() {
  },

  @Cmd.batch
  RetreiveBoxLetters() {
    return [
      Data.Logic.SetIdentifier(getLettersIdnt(this.shared)).model(this.model.letters),
      Data.Logic.Retreive().model(this.model.letters)
    ];
  },

  @Cmd.batch
  RetreiveBoxes() {
    return Data.Logic.Retreive().model(this.model.boxes);
  },

  @Cmd.batch
  OpenBox(box) {
    return MailRoutes.Inbox({ box });
  }
};
