/**
 * Created by user on 2019/6/18.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import globby from 'globby';
import * as _pkg from '../package.json';

const ROOT = path.join(__dirname, '..');

globby(_pkg.workspaces.map(v => path.join(v, 'package.json')), {
  absolute: true,
  cwd: ROOT,
}).then((ls: string[]) => {
  const resolutions: Record<string, string> = (_pkg as any).resolutions || {};

  let pkgMap = ls.reduce(
    (a, file) => {
      let json = fs.readJSONSync(file);
      let name = json.name;
      let version = json.version;
      a[name] = {
        version,
        file,
        json,
      };
      return a;
    },
    {} as {
      [k: string]: {
        version: string;
        json: {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          peerDependencies?: Record<string, string>;
        };
        file: string;
      };
    }
  );

  Object.keys(pkgMap).forEach(name => {
    let data = pkgMap[name];
    let changed = false;
    let label = path.relative(ROOT, data.file);

    console.log(`[check]`, label);

    [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'resolutions',
    ].forEach(key => {
      if (data.json[key]) {
        Object.entries(data.json[key]).forEach(([d, v]: [string, string]) => {
          if (d in resolutions && resolutions[d] !== v) {
            changed = true;
            data.json[key][d] = resolutions[d];
          } else if (d in pkgMap) {
            data.json[key][d] = v.replace(
              /^([\^~>=<]+)?(.+?)$/,
              (sv, s1, s2) => {
                if (s2 != pkgMap[d].version) {
                  changed = true;
                  return `${s1}${pkgMap[d].version}`;
                }
                return sv;
              }
            );
          }
        });
      }
    });

    if (changed) {
      console.log(`[changed]`, label);
      fs.writeJSONSync(data.file, data.json, {
        spaces: 2,
      });
    }
  });
});
