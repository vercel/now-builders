const assert = require('assert');

module.exports = async ({ deploymentUrl, fetch }) => {
  const resp = await fetch(`https://${deploymentUrl}/index.php`);
  assert.equal(
    await resp.text(),
    [
      'T_OPEN_TAG',
      'T_WHITESPACE',
      'T_CLASS',
      'T_WHITESPACE',
      'T_STRING',
      'T_CONST',
      'T_WHITESPACE',
      'T_STRING',
      'T_LNUMBER',
    ].join('\n'),
  );
};
