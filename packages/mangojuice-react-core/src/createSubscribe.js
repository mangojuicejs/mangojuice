import { procOf, logicOf, utils, observe, observeContext, message } from 'mangojuice-core';


function createMessageEmitter(models, msgCreator) {
  return (...args) => {
    const msgCmd = message(msgCreator, ...args);
    utils.fastForEach(models, (model) => {
      const proc = procOf(model);
      if (proc) {
        proc.update(msgCmd);
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
    const { stopper, model } = observe(target, handler, {
      model: rootModel,
      batched: true
    });
    stoppers.push(stopper);
    models.push(model);
  });

  const stopper = () => utils.fastForEach(stoppers, (x) => x());
  return { stopper, models };
}

function calculatePropsHash({ to, events }) {
  let hash = '';
  utils.maybeForEach(to, (m) => hash += utils.identify(m) + '.');
  utils.maybeForEach(events, (e) => hash += utils.identify(e) + '.');
  return hash;
}


function createSubscribe(reactImpl) {
  const { Component, createElement } = reactImpl;

  class Subscribe extends Component {
    componentWillMount() {
      const propsHash = calculatePropsHash(this.props);
      this.setupObservers(this.props, propsHash);
    }

    componentWillUpdateProps(nextProps) {
      const nextPropsHash = calculatePropsHash(nextProps);
      if (nextPropsHash !== this.propsHash) {
        this.stopper();
        this.setupObservers(nextProps, nextPropsHash);
        this.shouldUpdate = true;
      }
    }

    componentWillUnmount() {
      this.unmounted = true;
      if (this.stopper) {
        this.stopper();
      }
    }

    shouldComponentUpdate() {
      if (this.shouldUpdate) {
        this.shouldUpdate = false;
        return true;
      }
    }

    setupObservers(props, hash) {
      const { to, events } = props;
      const { stopper, models } = observeModels(to, this.updateView);
      const messageEmitters = bindMessages(models, events);
      this.propsHash = hash;
      this.unmounted = false;
      this.stopper = stopper;
      this.viewArgs = [
        ...models,
        ...messageEmitters
      ];
    }

    updateView = () => {
      if (!this.unmounted) {
        this.forceUpdate();
      }
    };

    render() {
      const { children } = this.props;
      const renderProp = utils.is.array(children) ? children[0] : children;
      return renderProp(...this.viewArgs);
    }
  }

  return Subscribe;
};

export default createSubscribe;
