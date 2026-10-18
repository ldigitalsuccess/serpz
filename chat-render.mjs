// Avoid overlapping DOM writes while a room's details or messages are loading.
export function serializeRenders(render) {
  let pending = Promise.resolve();
  return (...args) => {
    const result = pending.then(() => render(...args));
    pending = result.catch(() => {});
    return result;
  };
}
