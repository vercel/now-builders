import { parse } from 'path';
import { ShouldServeOptions } from './types';

export default function shouldServe({
  entrypoint,
  files,
  requestPath
}: ShouldServeOptions): boolean {
  requestPath = requestPath.replace(/\/$/, ''); // sanitize trailing '/'
  entrypoint = entrypoint.replace(/\\/, '/'); // windows compatibility

  if (entrypoint === requestPath && hasProp(files, entrypoint)) {
    return true;
  }

  const { dir, name } = parse(entrypoint);
  if (name === 'index' && dir === requestPath && hasProp(files, entrypoint)) {
    return true;
  }

  return false;
}

function hasProp (obj: Map<string, any>, key: string): boolean {
  return Object.hasOwnProperty.call(obj, key)
}
