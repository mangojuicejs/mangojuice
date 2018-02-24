import { child, logicOf, procOf, utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import MounterCore from 'mangojuice-react-core';


export default (React, ReactDOM, Subscribe, implName) => {
  const ChildEvents = {
    UpdateChild: (val) => ({ val })
  };
  class ChildLogic {
    create(props) {
      return { isChild: true, ...props };
    }
    update(msg) {
      return [
        msg.when(ChildEvents.UpdateChild, () => ({ a: msg.val }))
      ];
    }
  }
  const AppEvents = {
    UpdateA: (val) => ({ val })
  };
  class AppLogic {
    create(props) {
      return {
        a: 'test',
        nested: child(ChildLogic).create({ whoo: 123 }),
        ...props
      };
    }
    update(msg) {
      return [
        msg.when(AppEvents.UpdateA, () => ({ a: msg.val }))
      ];
    }
  }

  describe(`React interface view renderer: ${implName}`, () => {
    let containerEl;
    beforeEach(() => {
      containerEl = document.createElement('div');
      containerEl.id = 'container';
      document.body.appendChild(containerEl);
    });
    afterEach(() => {
      containerEl.remove();
      ReactDOM.unmountComponentAtNode(containerEl);
    });

    it('shuold render a stateless view of a block', async () => {
      const SimpleView = ({ model }) => (
        <Subscribe to={model} events={AppEvents}>
          {(model, appEvt) => (
            <span id="button" onClick={() => appEvt.UpdateA('another')}>
              {model.a}
            </span>
          )}
        </Subscribe>
      );
      const { app, commands } = await runWithTracking({ app: AppLogic });
      ReactDOM.render(<SimpleView model={app.model} />, containerEl)

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('another');
      expect(commands).toMatchSnapshot();
    });

    it('shuold subscribe to multiple models and bind multiple messages', async () => {
      const SimpleView = ({ model }) => (
        <Subscribe to={[model, model.nested]} events={[AppEvents, ChildEvents]}>
          {(model, childModel, appEvt, childEvt) => (
            <span id="button" onClick={() => {
              appEvt.UpdateA('another');
              childEvt.UpdateChild('something');
            }}>
              <span>{model.a}</span><span>{model.nested.a}</span>
            </span>
          )}
        </Subscribe>
      );
      const { app, commands } = await runWithTracking({ app: AppLogic });
      ReactDOM.render(<SimpleView model={app.model} />, containerEl)

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(commands).toMatchSnapshot();
      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('<span>another</span><span>something</span>');
    });
  });
};
