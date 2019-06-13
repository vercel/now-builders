import {
  NowRequest,
  NowResponse,
  RequestCookies,
  RequestQuery,
  RequestBody,
} from './types';
import { Stream } from 'stream';
import { Server } from 'http';
import { Bridge } from './bridge';

function getBodyParser(req: NowRequest, body?: Buffer) {
  return function parseBody(): RequestBody {
    if (!body || !req.headers['content-type']) {
      return undefined;
    }

    const { parse: parseCT } = require('content-type');
    const { type, parameters } = parseCT(req.headers['content-type']);
    const encoding = parameters.charset || 'utf-8';

    if (type === 'application/json') {
      try {
        return JSON.parse(body.toString(encoding));
      } catch (error) {
        throw new ApiError(400, 'Invalid JSON');
      }
    }

    if (type === 'application/octet-stream') {
      return body;
    }

    if (type === 'application/x-www-form-urlencoded') {
      const { parse: parseQS } = require('querystring');
      // remark : querystring.parse does not produce an iterable object
      // https://nodejs.org/api/querystring.html#querystring_querystring_parse_str_sep_eq_options
      return parseQS(body.toString(encoding));
    }

    if (type === 'text/plain') {
      return body.toString(encoding);
    }

    return undefined;
  };
}

function getQueryParser({ url = '/' }: NowRequest) {
  return function parseQuery(): RequestQuery {
    const { URL } = require('url');
    // we provide a placeholder base url because we only want searchParams
    const params = new URL(url, 'https://n').searchParams;

    const query: { [key: string]: string | string[] } = {};
    for (const [key, value] of params) {
      query[key] = value;
    }

    return query;
  };
}

function getCookieParser(req: NowRequest) {
  return function parseCookie(): RequestCookies {
    const header: undefined | string | string[] = req.headers.cookie;

    if (!header) {
      return {};
    }

    const { parse } = require('cookie');
    return parse(Array.isArray(header) ? header.join(';') : header);
  };
}

function sendStatusCode(res: NowResponse, statusCode: number): NowResponse {
  res.statusCode = statusCode;
  return res;
}

function sendData(res: NowResponse, body: any): NowResponse {
  if (body === null) {
    res.end();
    return res;
  }

  const contentType = res.getHeader('Content-Type');

  if (Buffer.isBuffer(body)) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.setHeader('Content-Length', body.length);
    res.end(body);
    return res;
  }

  if (body instanceof Stream) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    body.pipe(res);
    return res;
  }

  let str = body;

  // Stringify JSON body
  if (typeof body === 'object' || typeof body === 'number') {
    str = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader('Content-Length', Buffer.byteLength(str));
  res.end(str);

  return res;
}

function sendJson(res: NowResponse, jsonBody: any): NowResponse {
  // Set header to application/json
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Use send to handle request
  return res.send(jsonBody);
}

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function sendError(
  res: NowResponse,
  statusCode: number,
  message: string
) {
  res.statusCode = statusCode;
  res.statusMessage = message;
  res.end();
}

function setLazyProp<T>(req: NowRequest, prop: string, getter: () => T) {
  const opts = { configurable: true, writable: true, enumerable: true };

  Object.defineProperty(req, 'query', {
    ...opts,
    get: () => {
      const value = getter();
      // we set the property on the object to avoid recalculating it
      Object.defineProperty(req, prop, { ...opts, value });
      return value;
    },
    set: value => {
      Object.defineProperty(req, prop, { ...opts, value });
    },
  });
}

export function createServerWithHelpers(
  listener: (req: NowRequest, res: NowResponse) => void | Promise<void>,
  bridge: Bridge
) {
  const server = new Server(async (_req, _res) => {
    const req = _req as NowRequest;
    const res = _res as NowResponse;

    try {
      const reqId = req.headers['x-now-bridge-request-id'];

      // don't expose this header to the client
      delete req.headers['x-now-bridge-request-id'];

      if (typeof reqId !== 'string') {
        throw new ApiError(500, 'Internal Server Error');
      }

      const event = bridge.consumeEvent(reqId);

      setLazyProp<RequestCookies>(req, 'cookies', getCookieParser(req));
      setLazyProp<RequestQuery>(req, 'query', getQueryParser(req));
      setLazyProp<RequestBody>(req, 'body', getBodyParser(req, event.body));

      res.status = statusCode => sendStatusCode(res, statusCode);
      res.send = data => sendData(res, data);
      res.json = data => sendJson(res, data);

      await listener(req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        sendError(res, err.statusCode, err.message);
      } else {
        sendError(res, 500, 'Internal Server Error');
      }
    }
  });

  return server;
}
