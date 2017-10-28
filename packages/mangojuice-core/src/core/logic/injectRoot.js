import procOf from './procOf';


function findRootProc(proc) {
  let currParent = proc;
  while (currParent) {
    const nextParent = currParent.parent;
    if (!nextParent) {
      return currParent;
    }
  }
}

/**
 * Get proc attached to given model, find root proc
 * in the tree and add new parent proc to the root,
 * so given proc will become a new root in the tree
 * @param  {Object} model
 * @param  {Promise} destroyPromise
 * @param  {Process} newRoot
 */
function injectRoot(model, destroyPromise, proc) {
  const modelProc = procOf(model, true);
  if (!modelProc) return;

  const rootProc = findRootProc(modelProc);
  const newRoot = {
    parent: null,
    logic: proc.logic,
    exec: proc.exec
  };
  rootProc.parent = newRoot;
  const removeTreeNode = () => rootProc.parent = newRoot.parent;
  destroyPromise.then(removeTreeNode);
}

export default injectRoot;
