/** @typedef { import('@now/build-utils/file-ref').Files } Files */

/**
 * @callback delegate
 * @argument {string} name
 * @returns {string}
 */

/**
 * Rename files using delegate function
 * @argument {Files} files
 * @argument {delegate} delegate
 * @returns {Files}
 */
module.exports = function rename(files, delegate) {
  return Object.keys(files).reduce(
    (newFiles, name) => ({
      ...newFiles,
      [delegate(name)]: files[name],
    }),
    {},
  );
};
