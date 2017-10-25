// TODO

export function debounce(debounceTime = 100) {
  return (obj, name, descr) => {
    return getCommandDescriptor(obj, name, descr, createThrottleCmd, {
      debounceTime
    });
  };
}
