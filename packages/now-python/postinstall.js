const os = require('os');
const execa = require('execa');

async function downloadAndInstallPip() {
  const uname = os.release();
  console.log(`current system uname: ${uname}`);

  if (!uname.includes('amzn2.x86_64')) {
    console.log('not running in the cloud, skipping install');
    return;
  }

  console.log('running in the cloud, installing python...');

  await execa('yum-config-manager', ['--enable', 'epel'], {
    stdio: 'inherit',
  });
  await execa(
    'yum',
    ['install', '-y', 'https://centos6.iuscommunity.org/ius-release.rpm'],
    { stdio: 'inherit' }
  );
  //await execa('yum', ['update'], { stdio: 'inherit' });
  await execa(
    'yum',
    [
      'install',
      '-y',
      'python36u',
      'python36u-libs',
      'python36u-devel',
      'python36u-pip',
    ],
    { stdio: 'inherit' }
  );
}

downloadAndInstallPip()
  .then(() => console.log('Done'))
  .catch(e => console.error(e));
