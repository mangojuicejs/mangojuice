import { extend, maybeForEach, maybeMap } from '../core/utils';


/**
 * Minimal fast event emitter
 */
function EventEmitter() {}

extend(EventEmitter.prototype, {
  /**
   * Adds an event listener for given event name
   * @param {String} event
   * @param {Function} listener
   */
  addListener(event, listener) {
    if (listener) {
      const events = this.events || {};
      events[event] = events[event] || [];
      events[event].push(listener);
      this.events = events;
    }
  },

  /**
   * Remove a listener of some event if exists
   * @param  {string} event
   * @param  {function} listener
   */
  removeListener(event, listener) {
    const { events } = this;
    const handlers = events && events[event];

    if (handlers) {
      const newHandlers = [];
      const listenerRemover = handler => {
        if (handler !== listener) {
          newHandlers.push(handler);
        }
      };
      maybeForEach(handlers, listenerRemover);
      events[event] = newHandlers;
    }
  },

  /**
   * Emit an event with one possible argument. Returns a Promise
   * when all handlers will be executed (and returned promises
   * from handlers will be resolved)
   * @param  {string} event
   * @param  {any} arg
   * @return {Promise}
   */
  emit(event, arg) {
    const { events } = this;
    const handlers = events && events[event];
    const doEmit = handler => handler(arg);
    return Promise.all(maybeMap(handlers, doEmit));
  }
});

export default EventEmitter;
