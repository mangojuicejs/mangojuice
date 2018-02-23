/**
 * Returns all used chunks while execution of the logic
 * by given proc logic
 * @param  {Process} proc
 * @return {Array<string>}
 */
function getUsedChunks(proc) {
  const chunks = proc.internalContext.chunks || {};
  return Object.keys(chunks);
}

export default getUsedChunks;
