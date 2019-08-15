import { IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { hello } from '../dep';

export default function(req: IncomingMessage, res: ServerResponse) {
  hello('world');
  const str = readFileSync('../dep.js', 'utf8');
  if (req && str) {
    res.end(str);
  } else {
    res.end('no req found');
  }
}
