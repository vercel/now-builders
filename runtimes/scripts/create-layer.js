const { promisify } = require('util');
const { join: joinPath, relative: relativePath } = require('path');
const fs = require('fs');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const { ZipFile } = require('yazl');
const glob = promisify(require('glob'));
const { Lambda } = require('aws-sdk');
const streamToBuffer = promisify(require('fast-stream-to-buffer'));

const usage = `Usage: node create-layer.js <opts>

  Options:
    --help                    Print this message
    --aws-access-key-id       AWS access key ID
    --aws-secret-access-key   AWS secret access key
    --name                    Name of the layer
    --dir-path                Absolute path of a directory to be included in the layer. Can be used multiple times.
                              Note that all directories will be merged in the root of the layer
    --layers-json-path        Path for the "layers.json" file
    --key-for-layers-json     Key of "layers.json" in which the layer ARN will be added to
`;

function getArgs() {
  let args;
  try {
    args = require('arg')({
      '--help': Boolean,
      '--aws-access-key-id': String,
      '--aws-secret-access-key': String,
      '--name': String,
      '--dir-path': [String],
      '--layers-json-path': String,
      '--key-for-layers-json': String,
    });
  } catch (err) {
    if (err.message.indexOf('Unknown or unexpected option') === -1) throw err;
    console.error(usage);
    process.exit(1);
  }
  return args;
}

function ensureRequiredArgsArePresent(args) {
  if (
    !(
      args['--aws-access-key-id']
      && args['--aws-secret-access-key']
      && args['--name']
      && args['--dir-path']
      && args['--layers-json-path']
      && args['--key-for-layers-json']
    )
  ) {
    // every option is mandatory
    console.error('> Error: Missing one or more mandatory option(s)');
    console.error(usage);
    process.exit(1);
  }
}

async function createLambdaInstances({
  regions: REGIONS,
  awsAccessKeyId,
  awsSecretAccessKey,
}) {
  const lambdaInstances = {};
  await Promise.all(
    Object.keys(REGIONS).map((region) => {
      const awsRegion = REGIONS[region];
      lambdaInstances[region] = new Lambda({
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        region: awsRegion,
      });
      return null;
    }),
  );
  return lambdaInstances;
}

// scans each directory on `dirPaths`,
// normalizes the found files as if
// `dirPath` was the root, and exclude any duplicates
// returns an object like {relativeFilePath: fullFilePath}
async function getFiles(dirPaths) {
  const allFiles = {};
  // we need to iterate over `dirPaths` syncronously in order
  // to exclude duplicates
  // eslint-disable-next-line no-restricted-syntax
  for (const dirPath of dirPaths) {
    const globPattern = joinPath(dirPath, '**');
    const globOpts = { dot: true, stat: true, statCache: {} };

    // eslint-disable-next-line no-await-in-loop
    const files = await glob(globPattern, globOpts);

    // eslint-disable-next-line array-callback-return
    files.map((filePath) => {
      if (!globOpts.statCache[filePath].isFile()) {
        return;
      }
      const relativeFilePath = relativePath(dirPath, filePath);
      if (allFiles[relativeFilePath]) {
        console.log(
          `WARN: ignoring duplicated file "${filePath}"; It already exists as "${
            allFiles[relativeFilePath]
          }"`,
        );
        return;
      }
      allFiles[relativeFilePath] = filePath;
    });
  }
  return allFiles;
}

async function createZipFileBuffer(files) {
  const zipFile = new ZipFile();
  Object.keys(files).forEach((relativeFilePath) => {
    zipFile.addFile(files[relativeFilePath], relativeFilePath);
  });

  zipFile.end();
  return streamToBuffer(zipFile.outputStream);
}

async function createAwsLambdaLayer({
  name,
  lambdaClientInstance,
  zipFileBuffer,
}) {
  return lambdaClientInstance
    .publishLayerVersion({
      Content: {
        ZipFile: zipFileBuffer,
      },
      LayerName: name,
      CompatibleRuntimes: ['provided'],
      LicenseInfo: 'MIT',
    })
    .promise();
}

async function makeAwsLambdaLayerVersionPublic({
  name,
  version,
  lambdaClientInstance,
}) {
  return lambdaClientInstance
    .addLayerVersionPermission({
      Action: 'lambda:GetLayerVersion',
      LayerName: name,
      VersionNumber: version,
      Principal: '*',
      StatementId: 'publish',
    })
    .promise();
}

function sortLayersJson(layersJson) {
  const sorted = {};

  // this first loop will iterate over a list of ordered
  // node.js versions
  Object.keys(layersJson)
    .sort()
    .forEach((version) => {
      const versionObject = {};
      // this loop will iterate over a list of ordered
      // regions for each node.js version
      Object.keys(layersJson[version])
        .sort()
        .forEach((region) => {
          versionObject[region] = layersJson[version][region].sort();
        });
      sorted[version] = versionObject;
    });

  return sorted;
}

async function main() {
  const args = getArgs();
  if (args['--help']) {
    console.error(usage);
    process.exit(2);
  }

  ensureRequiredArgsArePresent(args);

  const awsAccessKeyId = args['--aws-access-key-id'];
  const awsSecretAccessKey = args['--aws-secret-access-key'];
  const name = args['--name'];
  const dirPaths = args['--dir-path'];
  const layersJsonPath = args['--layers-json-path'];
  const keyForLayersJson = args['--key-for-layers-json'];

  const REGIONS = {
    sfo1: 'us-west-1',
    bru1: 'eu-central-1',
    gru1: 'sa-east-1',
    iad1: 'us-east-1',
  };

  const lambdaInstances = await createLambdaInstances({
    regions: REGIONS,
    awsAccessKeyId,
    awsSecretAccessKey,
  });

  const files = await getFiles(dirPaths);
  const zipFileBuffer = await createZipFileBuffer(files);

  const layers = {};
  await Promise.all(
    Object.keys(REGIONS).map(async (region) => {
      const lambdaClientInstance = lambdaInstances[region];
      let layer;
      try {
        layer = await createAwsLambdaLayer({
          name,
          lambdaClientInstance,
          zipFileBuffer,
        });
      } catch (err) {
        console.error('Could not publish layer to AWS');
        console.error(err);
        process.exit(1);
      }
      try {
        await makeAwsLambdaLayerVersionPublic({
          name,
          version: layer.Version,
          lambdaClientInstance,
        });
      } catch (err) {
        console.error('Could not make the layer public');
        console.log(err);
        process.exit(1);
      }
      layers[region] = layer.LayerVersionArn;
    }),
  );

  let layersJson;
  try {
    layersJson = JSON.parse(await readFile(layersJsonPath));
  } catch (err) {
    if (err.code === 'ENOENT') {
      // there's no layers.json yet – that's fine
      layersJson = {};
    } else {
      throw err;
    }
  }

  layersJson[keyForLayersJson] = layersJson[keyForLayersJson] || {};
  Object.keys(layers).map((region) => {
    const array = layersJson[keyForLayersJson][region] || [];
    array.push(layers[region]);
    layersJson[keyForLayersJson][region] = array;
    return null;
  });

  await writeFile(
    layersJsonPath,
    JSON.stringify(sortLayersJson(layersJson), null, 2),
  );
}

main().catch(console.error);
