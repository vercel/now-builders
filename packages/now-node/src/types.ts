import { ServerResponse, IncomingMessage } from 'http';

export type NowRequest = IncomingMessage & {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
};

export type NowResponse = ServerResponse & {
  send: (body: any) => void;
  json: (body: any) => void;
  status: (statusCode: number) => void;
};

export interface NowAddon {
  body: Buffer;
}

export type NowAddonListener = (
  req: IncomingMessage,
  res: ServerResponse,
  addon: NowAddon
) => void | Promise<void>;
