import say from '@builders-test/lib';

const handler = (req, resp) => {
  resp.end(say());
};

export default handler;
