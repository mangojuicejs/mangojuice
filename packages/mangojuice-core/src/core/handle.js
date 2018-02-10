import observe from './observe';


function handle(model, handler) {
  return observe(model, handler, { type: 'handlers' });
}

export default handle;
