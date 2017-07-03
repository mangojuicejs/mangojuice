export function getLazyCommand(block, cmdName) {
  var Logic = block.Logic;
  if (Logic[cmdName]) {
    return Logic[cmdName];
  } else if (Logic.__get) {
    return Logic.__get(Logic, cmdName);
  } else {
    throw new Error(`There is no command "${cmdName}" in`, block);
  }
}
