import { join, dirname } from 'path';
import execa from 'execa';
import { ensureDir, move, remove, stat, readFile, writeFile } from 'fs-extra';
import mm from 'micromatch';
import {
  download,
  getWriteableDirectory,
  glob,
  createLambda,
  BuildOptions,
} from '@now/build-utils';
import { installBundler } from './install-ruby';

const REQUIRED_VENDOR_DIR = 'vendor/bundle/ruby/2.5.0';

async function dirExists(directory: string) {
  let dirStat;

  try {
    dirStat = await stat(directory);
  } catch (e) {
    return false;
  }

  return dirStat.isDirectory();
}

async function bundleInstall(
  bundlePath: string,
  bundleDir: string,
  gemfilePath: string
) {
  console.log(`running "bundle install --deployment"...`);
  const bundleAppConfig = await getWriteableDirectory();

  try {
    await execa(
      bundlePath,
      [
        'install',
        '--deployment',
        '--gemfile',
        gemfilePath,
        '--path',
        bundleDir,
      ],
      {
        stdio: 'inherit',
        env: {
          BUNDLE_SILENCE_ROOT_WARNING: '1',
          BUNDLE_APP_CONFIG: bundleAppConfig,
        },
      }
    );
  } catch (err) {
    console.log(`failed to run "bundle install --deployment"...`);
    throw err;
  }
}

export const config = {
  maxLambdaSize: '5mb',
};

export const build = async ({
  workPath,
  files,
  entrypoint,
  config,
}: BuildOptions) => {
  console.log('downloading files...');

  // eslint-disable-next-line no-param-reassign
  files = await download(files, workPath);

  const { gemHome, bundlerPath } = await installBundler();
  process.env.GEM_HOME = gemHome;

  const fsFiles = await glob('**', workPath);
  const entryDirectory = dirname(entrypoint);
  const fsEntryDirectory = dirname(fsFiles[entrypoint].fsPath);

  // check for an existing vendor directory
  console.log(
    'checking for existing vendor directory at',
    '"' + REQUIRED_VENDOR_DIR + '"'
  );
  const vendorDir = join(workPath, REQUIRED_VENDOR_DIR);
  const bundleDir = join(workPath, 'vendor/bundle');
  const relativeVendorDir = join(fsEntryDirectory, REQUIRED_VENDOR_DIR);

  let hasRootVendorDir = await dirExists(vendorDir);
  let hasRelativeVendorDir = await dirExists(relativeVendorDir);
  let hasVendorDir = hasRootVendorDir || hasRelativeVendorDir;

  if (hasRelativeVendorDir) {
    if (hasRootVendorDir) {
      console.log(
        'found two vendor directories, choosing the vendor directory relative to entrypoint'
      );
    } else {
      console.log('found vendor directory relative to entrypoint');
    }

    // vendor dir must be at the root for lambda to find it
    await move(relativeVendorDir, vendorDir);
  } else if (hasRootVendorDir) {
    console.log('found vendor directory in project root');
  }

  await ensureDir(vendorDir);

  // no vendor directory, check for Gemfile to install
  if (!hasVendorDir) {
    const gemFile = join(entryDirectory, 'Gemfile');

    if (fsFiles[gemFile]) {
      console.log(
        'did not find a vendor directory but found a Gemfile, bundling gems...'
      );
      const gemfilePath = fsFiles[gemFile].fsPath;

      // try installing. this won't work if native extesions are required.
      // if that's the case, gems should be vendored locally before deploying.
      try {
        await bundleInstall(bundlerPath, bundleDir, gemfilePath);
      } catch (err) {
        console.log(
          'unable to build gems from Gemfile. vendor the gems locally with "bundle install --deployment" and retry.'
        );
        throw err;
      }
    }
  } else {
    console.log('found vendor directory, skipping "bundle install"...');
  }

  // try to remove gem cache to slim bundle size
  try {
    await remove(join(vendorDir, 'cache'));
  } catch (e) {}

  const originalRbPath = join(__dirname, 'now_init.rb');
  const originalNowHandlerRbContents = await readFile(originalRbPath, 'utf8');

  // will be used on `require_relative '$here'` or for loading rack config.ru file
  // for example, `require_relative 'api/users'`
  console.log('entrypoint is', entrypoint);
  const userHandlerFilePath = entrypoint.replace(/\.rb$/, '');
  const nowHandlerRbContents = originalNowHandlerRbContents.replace(
    /__NOW_HANDLER_FILENAME/g,
    userHandlerFilePath
  );

  // in order to allow the user to have `server.rb`, we need our `server.rb` to be called
  // somethig else
  const nowHandlerRbFilename = 'now__handler__ruby';

  await writeFile(
    join(workPath, `${nowHandlerRbFilename}.rb`),
    nowHandlerRbContents
  );

  let outputFiles = await glob('**', workPath);

  // static analysis is impossible with ruby.
  // instead, provide `includeFiles` and `excludeFiles` config options to reduce bundle size.
  if (config && (config.includeFiles || config.excludeFiles)) {
    let outputPaths = Object.keys(outputFiles);

    let notIncluded = config.includeFiles
      ? mm.not(outputPaths, config.includeFiles)
      : outputPaths;
    let excluded = config.excludeFiles
      ? mm(notIncluded, config.excludeFiles)
      : [];

    for (let i = 0; i < excluded.length; i++) {
      // whitelist handler
      if (excluded[i] === `${nowHandlerRbFilename}.rb`) {
        continue;
      }

      // whitelist vendor directory
      if (excluded[i].startsWith(REQUIRED_VENDOR_DIR)) {
        continue;
      }

      delete outputFiles[excluded[i]];
    }
  }

  const lambda = await createLambda({
    files: outputFiles,
    handler: `${nowHandlerRbFilename}.now__handler`,
    runtime: 'ruby2.5',
    environment: {},
  });

  return {
    [entrypoint]: lambda,
  };
};
