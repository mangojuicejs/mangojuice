/**
 * To use {@link mount} function you need to implement a Mounter interface
 * which should have `mount` and `unmount` functions. It is up to the developer
 * how these functions will be implemented and what view library they will use.
 *
 * There is a rule that mounter and view library should follow: view of
 * a model should be updated only when the model updated and the update
 * shouldn't touch views of children models (children views shouldn't be updated
 * because their models is not changed).
 *
 * React perfectly fits for this rule. By implementing `shuoldComponentUpdate`
 * you can control when the component should be updated and when shouldn't. In this
 * case this function should always return `false` and componenent should be
 * updated using `forceUpdate` only when the model is updated (using {@link observe}).
 *
 * @example
 * // Minimal react mounter which follow the rules
 * class ViewWrapper extends React.Component {
 *   componentDidMount() {
 *     const { model } = this.props;
 *     this.stopObserver = observe(model, () => this.forceUpdate())
 *   }
 *   componentWillUnmount() {
 *     this.stopObserver();
 *   }
 *   shouldComponentUpdate() {
 *     return false;
 *   }
 *   render() {
 *     const { View, model } = this.props;
 *     const Logic = logicOf(model);
 *     return <View model={model} Logic={Logic} />
 *   }
 * }
 * class ReactMounter {
 *   mount(model, View) {
 *     return React.render(
 *       <ViewWrapper View={View} model={model} />,
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
 * Mount running block. As third and next arguments you can pass other running
 * blocks which will be stopped with the main running block (useful for HMR).
 *
 * @example
 * const MyBlock = {
 *   createModel: () => ({ field: 1 }),
 *   Logic: class MyLogic {
 *     \@cmd SomeCommand() {
 *       return { field: this.model.field + 1 };
 *     }
 *   },
 *   View: ({ model }) => (
 *     <div>{model.field}</div>
 *   )
 * };
 *
 * mount(new ReactMounter(), run(MyBlock));
 * @param  {Mounter} mounter   An implementation of {@link Mounter} interface
 * @param  {{ proc: Process, block: Block, model: Object }} runRes  An object that returned
 *                  from {@link run} function.
 * @return {{ view: any, stop: Function }}  An object with the result form {@link Mounter#mount}
 *                  function (in `view` field) and stop function which destroy the process and
 *                  unmount a view using {@link Mounter#unmount}
 */
function mount(mounter, runRes, ...otherBlocks) {
  const view = mounter.mount(mountBlock.model, mountBlock.block.View);
  const stop = () => {
    mountBlock.proc.destroy();
    otherBlocks.forEach(x => x.proc.destroy());
    mounter.unmount();
  };
  return { view, stop };
}

export default mount;
