import { join } from 'path';
import { readFile } from 'fs-extra';
import {
  createLambda,
  glob,
  download,
  FileBlob,
  runShellScript,
  BuildOptions,
  installDependencies,
} from '@now/build-utils';

export const config = {
  maxLambdaSize: '5mb',
  port: 5000,
  binary: 'bin/handler',
  readyText: '',
};

export async function build({
  files,
  entrypoint,
  config: userConfig,
  workPath,
}: BuildOptions) {
  console.log('downloading user files...');
  await download(files, workPath);
  await installDependencies(__dirname, [
    '--modules-folder',
    join(workPath, 'node_modules'),
  ]);
  await runShellScript(join(workPath, entrypoint));

  let outputFiles = await glob('**', workPath);

  const launcherPath = join(__dirname, 'launcher.js');
  let launcherData = await readFile(launcherPath, 'utf8');

  const port = userConfig.port || config.port;
  const binary = userConfig.binary || config.binary;
  const readyText = userConfig.readyText || config.readyText;

  launcherData = launcherData
    .replace("'__NOW_PORT'", `${port}`)
    .replace('__NOW_BINARY', binary)
    .replace('__NOW_READY_TEXT', readyText);

  const launcherFiles = {
    'launcher.js': new FileBlob({ data: launcherData }),
  };

  const lambda = await createLambda({
    files: { ...outputFiles, ...launcherFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10',
    environment: {},
  });

  return {
    [entrypoint]: lambda,
  };
}
