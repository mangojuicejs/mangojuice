import { child, logicOf, procOf, handle, message } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('message', () => {
  describe('create', () => {
    it('should create a message instance', () => {
      const TestEvent = (...args) => ({ hi: 'there', args });
      const msg = message(TestEvent, 1, 'test', 3);

      expect(msg).toMatchSnapshot();
      expect(msg.__creator).toEqual(TestEvent);
      expect(msg.__name).toEqual('TestEvent');
    });
  })

  describe('#is', () => {
    it('should compare with message creator', () => {
      const TestEvent = (...args) => ({ hi: 'there', args });
      const AnotherEvent = (...args) => ({ hi: 'there', args });
      const msg = message(TestEvent, 1, 'test', 3);

      expect(msg.is(TestEvent)).toEqual(true);
      expect(msg.is(AnotherEvent)).toEqual(false);
    });
  });

  describe('#when', () => {
    it('should compare with message creator and return result of the handler', () => {
      const handler = jest.fn((...args) => args);
      const TestEvent = (...args) => ({ hi: 'there', args });
      const AnotherEvent = (...args) => ({ hi: 'there', args });
      const msg = message(TestEvent, 1, 'test', 3);

      expect(msg.when(TestEvent, handler)).toMatchSnapshot();
      expect(msg.when(AnotherEvent, handler)).toEqual(undefined);
      expect(handler.mock.calls).toMatchSnapshot();
    });
  });
});
