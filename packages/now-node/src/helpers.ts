import { parse as parseCookies } from 'cookie';
import { Stream } from 'stream';
import getRawBody from 'raw-body';
import { URL } from 'url';
import { parse as parseCT } from 'content-type';
import { ServerResponse, IncomingMessage } from 'http';

type Request = IncomingMessage & {
  /**
   * Object of `query` values from url
   */
  query: {
    [key: string]: string | string[];
  };
  /**
   * Object of `cookies` from header
   */
  cookies: {
    [key: string]: string;
  };

  body: any;
};

type Response = ServerResponse & {
  send: (body: any) => void;
  json: (body: any) => void;
  status: (statusCode: number) => void;
};

/**
 * Parse incoming message like `json` or `urlencoded`
 * @param req
 */
async function parseBody(req: Request, limit: string = '1mb') {
  const contentType = parseCT(req.headers['content-type'] || 'text/plain');
  const { type, parameters } = contentType;
  const encoding = parameters.charset || 'utf-8';

  let buffer;

  try {
    buffer = await getRawBody(req, { encoding, limit });
  } catch (e) {
    if (e.type === 'entity.too.large') {
      throw new ApiError(413, `Body exceeded ${limit} limit`);
    } else {
      throw new ApiError(400, 'Invalid body');
    }
  }

  const body = buffer.toString();

  if (type === 'application/json' || type === 'application/ld+json') {
    return parseJson(body);
  } else if (type === 'application/x-www-form-urlencoded') {
    const qs = require('querystring');
    return qs.decode(body);
  } else {
    return body;
  }
}

/**
 * Parse `JSON` and handles invalid `JSON` strings
 * @param str `JSON` string
 */
function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    throw new ApiError(400, 'Invalid JSON');
  }
}

/**
 * Parsing query arguments from request `url` string
 * @param url of request
 * @returns Object with key name of query argument and its value
 */
function parseQuery(req: IncomingMessage) {
  if (req.url) {
    // This is just for parsing search params, base it's not important
    const params = new URL(req.url, 'https://n').searchParams;

    const obj: { [key: string]: string | string[] } = {};
    for (const [key, value] of params) {
      obj[key] = value;
    }
    return obj;
  } else {
    return {};
  }
}

/**
 *
 * @param res response object
 * @param statusCode `HTTP` status code of response
 */
function sendStatusCode(res: Response, statusCode: number) {
  res.statusCode = statusCode;
  return res;
}

/**
 * Send `any` body to response
 * @param res response object
 * @param body of response
 */
function sendData(res: Response, body: any) {
  if (body === null) {
    res.end();
    return;
  }

  const contentType = res.getHeader('Content-Type');

  if (Buffer.isBuffer(body)) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.setHeader('Content-Length', body.length);
    res.end(body);
    return;
  }

  if (body instanceof Stream) {
    if (!contentType) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    body.pipe(res);
    return;
  }

  let str = body;

  // Stringify JSON body
  if (typeof body === 'object' || typeof body === 'number') {
    str = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader('Content-Length', Buffer.byteLength(str));
  res.end(str);
}

/**
 * Send `JSON` object
 * @param res response object
 * @param jsonBody of data
 */
function sendJson(res: Response, jsonBody: any): void {
  // Set header to application/json
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Use send to handle request
  res.send(jsonBody);
}

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Sends error in `response`
 * @param res response object
 * @param statusCode of response
 * @param message of response
 */
export function sendError(res: Response, statusCode: number, message: string) {
  res.statusCode = statusCode;
  res.statusMessage = message;
  res.end();
}

export function addHelpers(listener: any) {
  return async function(req: Request, res: Response) {
    try {
      req.cookies = parseCookies(req.headers.cookie || '');
      req.query = parseQuery(req);
      req.body = await parseBody(req);

      res.status = statusCode => sendStatusCode(res, statusCode);
      res.send = data => sendData(res, data);
      res.json = data => sendJson(res, data);

      listener(req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        sendError(res, err.statusCode, err.message);
      } else {
        throw err;
      }
    }
  };
}
