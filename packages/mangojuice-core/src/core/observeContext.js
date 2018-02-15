import procOf from './procOf';
import context from './context';
import observe from './observe';


function observeContext(ctxFunc, handler, options) {
  const { model: rootModel, batched } = options;
  const modelProc = procOf(rootModel);
  let model = null;

  modelProc.exec(context(ctxFunc).get((m) => model = m));
  const stopper = observe(model, handler, { batched, type: 'childrenObservers' });

  return { stopper, model };
}

export default observeContext;
