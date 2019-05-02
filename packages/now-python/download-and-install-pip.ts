import os from 'os';
import execa from 'execa';

export async function downloadAndInstallPip() {
  const uname = os.release();
  console.log(`current system uname: ${uname}`);

  if (!uname.includes('amzn2.x86_64')) {
    console.log('Not running in amazon, skipping');
    return 'pip3';
  }

  try {
    console.log('installing python...');
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
  } catch (err) {
    console.log('could not install python');
    throw err;
  }

  return '/usr/bin/pip3.6';
}
