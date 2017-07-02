/**
 * An interface for view mounter.
 * The instance of this class should control only
 * one mounted view.
 */
export class DefaultViewMounter {
  /**
   * By given `Process` instance and view or root app
   * block mount the view in some way.
   * @param  {Process} proc
   * @param  {Function} view
   */
  mount(proc, view) {
    throw new Error("You are not passing some mounter implementation");
  }

  /**
   * Unmount currently mounted view
   */
  unmount() {
    throw new Error("Unmounter is not implemented");
  }
}

export default DefaultViewMounter;
