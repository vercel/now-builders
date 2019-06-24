import { intersects } from 'semver';
import { NodeVersion } from '../types';

const supportedOptions: NodeVersion[] = [
  { major: 10, range: '10.x', runtime: 'nodejs10.x' },
  { major: 8, range: '8.10.x', runtime: 'nodejs8.10' },
];

// This version should match Fargate's default in the PATH
// Today that is Node 8
export const defaultSelection = supportedOptions.filter(o => o.major === 8)[0];

export async function getSupportedNodeVersion(
  engineRange?: string
): Promise<NodeVersion> {
  let selection = defaultSelection;

  if (!engineRange) {
    console.log(
      'missing `engines` in `package.json`, using default runtime' +
        selection.runtime
    );
  } else {
    const found = supportedOptions.some(o => {
      // the array is already in order so return the first
      // match which will be the newest verison of node
      selection = o;
      return intersects(o.range, engineRange);
    });
    if (found) {
      console.log(
        'found `engines` in `package.json`, selecting runtime' +
          selection.runtime
      );
    } else {
      throw new Error(
        'found `engines` in `package.json` with an unsupported node range: ' +
          engineRange +
          '\nplease use `10.x` or `8.10.x` instead'
      );
    }
  }
  return selection;
}
