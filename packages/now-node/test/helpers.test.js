/* global beforeAll, beforeEach, afterAll, expect, it, jest */
const listen = require('test-listen');
const { createServer } = require('http');
const fetch = require('node-fetch');

const { addHelpers } = require('../dist/helpers');

const mockListener = jest.fn();
const listener = addHelpers(mockListener);

let server;
let url;

beforeAll(async () => {
  server = createServer(listener);
  url = await listen(server);
});

beforeEach(() => {
  mockListener.mockReset();
});

afterAll(async () => {
  await server.close();
});

it('req.query should reflect querystring in the url', async () => {
  mockListener.mockImplementation((req, res) => {
    res.send('hello');
  });

  await fetch(`${url}/?who=bill&where=us`);

  expect(mockListener.mock.calls[0][0].query).toMatchObject({
    who: 'bill',
    where: 'us',
  });
});

it('req.cookies should reflect req.cookie header', async () => {
  mockListener.mockImplementation((req, res) => {
    res.send('hello');
  });

  await fetch(url, {
    headers: {
      cookie: 'who=bill; where=us',
    },
  });

  expect(mockListener.mock.calls[0][0].cookies).toMatchObject({
    who: 'bill',
    where: 'us',
  });
});

it('res.send() should send text', async () => {
  mockListener.mockImplementation((req, res) => {
    res.send('hello');
  });

  const res = await fetch(url);

  expect(await res.text()).toBe('hello');
});

it('res.json() should send json', async () => {
  mockListener.mockImplementation((req, res) => {
    res.json({ who: 'bill' });
  });

  const res = await fetch(url);

  expect(await res.json()).toMatchObject({ who: 'bill' });
});

it('res.status() should set the status code', async () => {
  mockListener.mockImplementation((req, res) => {
    res.status(404);
    res.end();
  });

  const res = await fetch(url);

  expect(res.status).toBe(404);
});
