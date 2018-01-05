/**
 * To use {@link mount} function you need to implement a Mounter interface
 * which should have `mount` and `unmount` functions. It is up to the developer
 * how these functions will be implemented and what view library they will use.
 *
 * There is only one rule that mounter and view library shuold align: view of
 * a model should be update only when the model updated. And because of this
 * rule, a view library (and mounter implementation) have the following
 * requirements:
 * - View library should provide a way to nest one component to another
 * - View library should be able to update parent component without
 *   updating of children components (when model of parent block updated
 *   the view of children blocks shouldn't be updated)
 *
 * @example
 * class ReactMounter {
 *   mount(model, View) {
 *     return React.render(
 *       <View model={model} />,
 *       document.querySelector('#container')
 *     );
 *   }
 *   unmount() {
 *     return React.unmountComponentAtNode(
 *       document.querySelector('#container')
 *     );
 *   }
 * }
 * @interface Mounter
 * @property {Function} mount    A function that should expect two arguments: model object with
 *                               attached {@link Process} instance and {@link Block#View}.
 *                               It should render the model using given View (somehow).
 * @property {Function} unmount  A function that shuold unmount mounted view from DOM.
 */


/**
 * Mount given block. Returns results of mount in `view` (return
 * from mounter) and `stop` function, which will unmount the view
 * and destroy all processes
 *
 * @param  {Mounter}    mounter
 * @param  {Object}    mountBlock
 * @return {Object}
 */
function mount(mounter, mountBlock, ...otherBlocks) {
  const view = mounter.mount(mountBlock.model, mountBlock.block.View);
  const stop = (newMountBlock, ...newOtherBlocks) => {
    mountBlock.proc.destroy();
    otherBlocks.forEach(x => x.proc.destroy());
    mounter.unmount();
  };
  return { view, stop };
}

export default mount;
