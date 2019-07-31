async function install() {
  if (process.env.NODE_ENV !== 'production') return;
  const { downloadGo } = require('./go-helpers');
  await downloadGo();
}

install().catch(err => {
  console.error(err);
  process.exit(1);
});
