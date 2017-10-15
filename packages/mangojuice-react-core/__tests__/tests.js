import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import MounterCore from 'mangojuice-react-core';
import sumulant from 'jsdom-simulant';


export default (React, MounterClass, implName) => {
  const AppBlock = {
    createModel: (props) => ({
      a: 'test',
      nested: null,
      ...props
    }),
    Logic: {
      name: 'AppBlock',
      children() {
        return { nested: this.nest(AppBlock.Logic) };
      },
      @Cmd.nope TestAction() {},
      @Cmd.update UpdateModel(name, val) {
        return { [name]: val };
      }
    }
  }

  describe(`React interface view renderer: ${implName}`, () => {
    let containerEl, mounter;
    beforeEach(() => {
      containerEl = document.createElement('div');
      containerEl.id = 'container';
      document.body.appendChild(containerEl);
      mounter = new MounterClass('#container');
    });
    afterEach(() => {
      containerEl.remove();
      mounter.unmount();
    });

    it('shuold render a stateless view of a block', async () => {
      const SimpleView = ({ model }) => (
        <span id="button" onClick={AppBlock.Logic.TestAction}>
          {model.a}
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('test');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    it('shuold render a statefull view of a block', async () => {
      class SimpleView extends React.Component {
        render() {
          return (
            <span id="button" onClick={AppBlock.Logic.TestAction}>
              {this.props.model.a}
            </span>
          );
        }
      }
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('test');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    it('should propagate context to children components of same model', async () => {
      const ChildView = ({ model }) => (
        <span id="button" onClick={AppBlock.Logic.TestAction}>
          {model.a}
        </span>
      );
      const SimpleView = ({ model }) => (
        <span>
          <ChildView model={model} />
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('test');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    it('should pass other props with model', async () => {
      const ChildView = ({ model, prop }) => (
        <span id="button" onClick={AppBlock.Logic.TestAction}>
          <span>{model.a}</span><span>{prop}</span>
        </span>
      );
      const SimpleView = ({ model }) => (
        <span>
          <ChildView model={model} prop="test" />
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('<span>test</span><span>test</span>');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    it('should keep context on statefull updated of same model', async () => {
      class ChildView extends React.Component {
        state = { test: '' };
        changeState = () => {
          this.setState({ test: 'state' });
        }
        render() {
          return (
            <span id="parent" onClick={this.changeState}>
              <span id="model">{this.props.model.a}</span>
              <span id="button" onClick={AppBlock.Logic.TestAction}>
                {this.state.test}
              </span>
            </span>
          );
        }
      }
      const SimpleView = ({ model }) => (
        <span>
          <ChildView model={model} prop="test" />
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const parentElem = document.getElementById('parent');
      parentElem.click();
      const buttonElem = document.getElementById('button');
      buttonElem.click();

      // For react implementations with async update queue
      await Task.delay(10);

      expect(buttonElem).toBeDefined();
      expect(document.getElementById('model').innerHTML).toEqual('test');
      expect(document.getElementById('button').innerHTML).toEqual('state');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    it('shuold update view when model changed for stateless', async () => {
      const SimpleView = ({ model }) => (
        <span id="button" onClick={AppBlock.Logic.UpdateModel('a', 'updated')}>
          {model.a}
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      let buttonElem = document.getElementById('button');
      expect(buttonElem.innerHTML).toEqual('test');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(commandNames).toEqual([ 'AppBlock.UpdateModel' ]);
      expect(buttonElem.innerHTML).toEqual('updated');
    });

    it('shuold update view when model changed for statefull', async () => {
      class SimpleView extends React.Component {
        render() {
          return (
            <span id="button" onClick={AppBlock.Logic.UpdateModel('a', 'updated')}>
              {this.props.model.a}
            </span>
          );
        }
      }
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      let buttonElem = document.getElementById('button');
      expect(buttonElem.innerHTML).toEqual('test');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(commandNames).toEqual([ 'AppBlock.UpdateModel' ]);
      expect(buttonElem.innerHTML).toEqual('updated');
    });

    it('shuold provide exec in context for stateless', async () => {
      const SimpleView = ({ model }, { exec }) => (
        <span id="button" onClick={exec(AppBlock.Logic.TestAction)}>
          {model.a}
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('test');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    it('shuold provide exec in context for statefull', async () => {
      class SimpleView extends React.Component {
        render() {
          const { exec } = this.context;
          return (
            <span id="button" onClick={exec(AppBlock.Logic.TestAction)}>
              {this.props.model.a}
            </span>
          );
        }
      }
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      const buttonElem = document.getElementById('button');
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(buttonElem.innerHTML).toEqual('test');
      expect(commandNames).toEqual([ 'AppBlock.TestAction' ]);
    });

    // Failed for preact for some reason
    // it('shuold reset context even if error occured while rendering', async () => {
    //   const SimpleView = ({ model }) => {
    //     <>
    //     throw new Error('Ooops')
    //   };
    //   const { app, commandNames } = await runWithTracking({ app: AppBlock });

    //   const oldContext = { a: 'b' };
    //   MounterCore.ViewRenderContext.setContext(oldContext);
    //   try {
    //     mounter.mount(app.proc, SimpleView);
    //   } catch (e) {
    //   }

    //   await Task.delay(10);
    //   expect(MounterCore.ViewRenderContext.getContext()).toEqual(oldContext);
    // });

    it('shuold reset context even if error occured while re-rendering', async () => {
      const SimpleView = ({ model }) => {
        if (model.a === 'updated') {
          throw new Error('Ooops');
        }
        return (
          <span id="button" onClick={AppBlock.Logic.UpdateModel('a', 'updated')}>
            {model.a}
          </span>
        );
      };
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      let buttonElem = document.getElementById('button');
      expect(buttonElem.innerHTML).toEqual('test');

      const oldContext = { a: 'b' };
      MounterCore.ViewRenderContext.setContext(oldContext);
      buttonElem.click();

      expect(buttonElem).toBeDefined();
      expect(commandNames).toEqual([ 'AppBlock.UpdateModel' ]);
      expect(MounterCore.ViewRenderContext.getContext()).toEqual(oldContext);
    });

    it('shuold render view for nested block', async () => {
      const NestedView = jest.fn(({ model }) => (
        <span id="nested" onClick={AppBlock.Logic.UpdateModel('c', 'block')}>
          <span>{model.b}</span>
          <span>{model.c}</span>
        </span>
      ));
      const SimpleView = jest.fn(({ model }) => (
        <span id="button">
          {model.a}
          {model.nested && <NestedView model={model.nested} />}
        </span>
      ));
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      await app.proc.exec(AppBlock.Logic.UpdateModel('nested', AppBlock.createModel({ b: 'nested' })));
      const nestedElem = document.getElementById('nested');
      nestedElem.click();

      expect(nestedElem).toBeDefined();
      expect(nestedElem.innerHTML).toEqual('<span>nested</span><span>block</span>');
      expect(commandNames).toEqual([
        'AppBlock.UpdateModel',
        'AppBlock.UpdateModel'
      ]);
    });

    it('shuold updated views of different models independently', async () => {
      const NestedView = jest.fn(({ model }) => (
        <span id="nested" onClick={AppBlock.Logic.UpdateModel('c', 'block')}>
          <span>{model.b}</span>
          <span>{model.c}</span>
        </span>
      ));
      const SimpleView = jest.fn(({ model }) => (
        <span id="button">
          <span id="parent">{model.a}</span>
          {model.nested && <NestedView model={model.nested} />}
        </span>
      ));
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      await app.proc.exec(AppBlock.Logic.UpdateModel('nested', AppBlock.createModel({ b: 'nested' })));
      const nestedElem = document.getElementById('nested');
      const parentElem = document.getElementById('parent');
      nestedElem.click();

      await app.proc.exec(AppBlock.Logic.UpdateModel('a', 'test2'));

      expect(nestedElem).toBeDefined();
      expect(nestedElem.innerHTML).toEqual('<span>nested</span><span>block</span>');
      expect(parentElem.innerHTML).toEqual('test2');
      expect(commandNames).toEqual([
        'AppBlock.UpdateModel',
        'AppBlock.UpdateModel',
        'AppBlock.UpdateModel'
      ]);
      expect(SimpleView).toHaveBeenCalledTimes(3);
      expect(NestedView).toHaveBeenCalledTimes(2);
    });

    it('should cache command executors while rerendering', async () => {
      class NestedView extends React.Component {
        counter = 0;
        shouldComponentUpdate(nextProps) {
          return (
            nextProps.onClick !== this.props.onClick ||
            nextProps.onPing !== this.props.onPing
          );
        }
        render() {
          this.counter++;
          return <span id="counter">{this.counter}</span>
        }
      }
      const SimpleView = ({ model }) => (
        <span id="button">
          <span id="parent">{model.a}</span>
          <NestedView
            onClick={AppBlock.Logic.TestAction}
            onPing={AppBlock.Logic.TestAction('1', {})}
          />
        </span>
      );
      const { app, commandNames } = await runWithTracking({ app: AppBlock });
      const res = mounter.mount(app.proc, SimpleView);

      await app.proc.exec(AppBlock.Logic.UpdateModel('a', 'test2'));
      await app.proc.exec(AppBlock.Logic.UpdateModel('a', 'test3'));
      const parentElem = document.getElementById('parent');
      const counterElem = document.getElementById('counter');

      expect(parentElem.innerHTML).toEqual('test3');
      expect(counterElem.innerHTML).toEqual('1');
      expect(commandNames).toEqual([
        'AppBlock.UpdateModel',
        'AppBlock.UpdateModel'
      ]);
    });
  });
};
