import { Files } from '../file';
type Delegate = (name: string) => string;

function rename(files: Files, delegate: Delegate): Files {
  return Object.keys(files).reduce(
    (newFiles, name) => ({
      ...newFiles,
      [delegate(name)]: files[name],
    }),
    {},
  );
};

exports = rename;
