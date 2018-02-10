import observe from './observe';


function handle(type, model, handler) {
  return observe(model, handler, { type: 'handlers' });
}

export default handle;
