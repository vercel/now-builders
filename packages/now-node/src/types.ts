import { ServerResponse, IncomingMessage } from 'http';

export type RequestCookies = { [key: string]: string };
export type RequestQuery = { [key: string]: string | string[] };
export type RequestBody = any;

export type NowRequest = IncomingMessage & {
  query: RequestQuery;
  cookies: RequestCookies;
  body: RequestBody;
};

export type NowResponse = ServerResponse & {
  send: (body: any) => NowResponse;
  json: (body: any) => NowResponse;
  status: (statusCode: number) => NowResponse;
};
