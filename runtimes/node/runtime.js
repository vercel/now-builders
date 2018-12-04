const path = require('path');
const fetch = require('node-fetch');

const { AWS_LAMBDA_RUNTIME_API, LAMBDA_TASK_ROOT } = process.env;
// eslint-disable-next-line no-underscore-dangle
const [handlerFilename, handlerFunctionName] = process.env._HANDLER.split('.');
process.chdir(LAMBDA_TASK_ROOT);
const handler = require(path.join(LAMBDA_TASK_ROOT, handlerFilename))[
  handlerFunctionName
];
const baseUrl = `http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation`;

async function getEvent() {
  const res = await fetch(`${baseUrl}/next`);

  const payload = res.json();
  const requestId = res.headers.get('lambda-runtime-aws-request-id');

  return { payload, requestId };
}

async function sendResponse({ requestId, response }) {
  return fetch(`${baseUrl}/${requestId}/response`, {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

async function run() {
  /* eslint-disable no-await-in-loop */
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { payload, requestId } = await getEvent();

    const response = await handler(payload);

    await sendResponse({ requestId, response });
  }
}
run();
