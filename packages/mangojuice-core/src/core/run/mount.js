/**
 * Mount given block. Returns results of mount in `view` (return
 * from mounter) and `stop` function, which will unmount the view
 * and destroy all processes
 * @param  {Mounter}    mounter
 * @param  {Object}    mountBlock
 * @return {Object}
 */
function mount(mounter, mountBlock, ...otherBlocks) {
  const view = mounter.mount(mountBlock.proc, mountBlock.block.View);
  const stop = (newMountBlock, ...newOtherBlocks) => {
    mountBlock.proc.destroy();
    otherBlocks.forEach(x => x.proc.destroy());
    mounter.unmount();
  };
  return { view, stop };
}

export default mount;
