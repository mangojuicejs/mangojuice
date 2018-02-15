import { procOf, logicOf, utils, observe, observeContext, message } from 'mangojuice-core';


function createMessageEmitter(models, msgCreator) {
  return (...args) => {
    const msgCmd = message(msgCreator, ...args);
    utils.fastForEach(models, () => {
      const proc = procOf(model);
      if (proc) {
        proc.exec(msgCmd);
      }
    });
  };
}

function bindMessages(models, allMessages) {
  const allHandlers = [];

  utils.maybeForEach(allMessages, (messages) => {
    const handlers = {};
    allHandlers.push(handlers);
    utils.fastForEach(Object.keys(messages), (msgName) => {
      handlers[msgName] = createMessageEmitter(models, messages[msgName]);
    });
  });

  return allHandlers;
}

function observeModels(targets, handler) {
  const rootModel = utils.maybeFind(targets, (x) => utils.is.object(x));
  const stoppers = [];
  const models = [];

  utils.maybeForEach(targets, (target) => {
    if (utils.is.func(target)) {
      const { stopper, model } = observeContext(target, handler, {
        model: rootModel,
        batched: true
      });
      stoppers.push(stopper);
      models.push(model);
    } else {
      const stopper = observe(target, handler, { batched: true });
      stoppers.push(stopper);
      models.push(target);
    }
  });

  const stopper = () => utils.fastForEach(stoppers, (x) => x());
  return { stopper, models };
}


function createSubscribe(reactImpl) {
  const { Component, createElement } = reactImpl;

  class Subscribe extends Component {
    componentWillMount() {
      const { to, events } = this.props;
      const { stopper, models } = observeModels(to, this.updateView);
      const messageEmitters = bindMessages(models, events);
      this.unmounted = false;
      this.stopper = stopper;
      this.viewArgs = [
        ...models,
        ...messageEmitters
      ];
    }

    componentWillUnmount() {
      this.unmounted = true;
      if (this.stopper) {
        this.stopper();
      }
    }

    updateView = () => {
      if (!this.unmounted) {
        this.forceUpdate();
      }
    };

    render() {
      const { children } = this.props;
      return children[0](...this.viewArgs);
    }
  }

  class UpdateBlocker extends Component {
    shouldComponentUpdate() {
      return false;
    }
    render() {
      return <Subscribe {...this.props} />
    }
  }

  return UpdateBlocker;
};

export default createSubscribe;
