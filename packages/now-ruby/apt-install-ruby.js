const execa = require('execa');

const PIPE = '|';
const BASHRC = '~/.bashrc';

async function tryRunCommand(cmd, ...args) {
  try {
    return await execa(cmd, args, { stdio: 'inherit' });
  } catch (err) {
    // console.log(`${err.message}`)
    throw err;
  }
}

async function gitClone(repoPath, destDir) {
  try {
    await tryRunCommand(
      'git',
      'clone',
      `https://github.com/${repoPath}.git`,
      destDir,
    );
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }
}

async function echo(msg, redirectionPath = null) {
  try {
    await tryRunCommand('echo', msg, `>> ${redirectionPath}`);
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }
}

// $ rbenv install -l | egrep "\s[0-9]\.[0-9]\.[0-9]$" | tail -1
async function getLatestRubyVersion() {
  try {
    await tryRunCommand(
      'rbenv install -l',
      PIPE,
      'egrep',
      's[0-9].[0-9].[0-9]$',
      PIPE,
      'tail -1',
    );
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }
}

async function installRBenv() {
  try {
    await tryRunCommand('sudo apt-get update');
    await tryRunCommand(
      'sudo apt install',
      'autoconf',
      'bison',
      'build-essential',
      'libssl-dev',
      'libyaml-dev',
      'libreadline6-dev',
      'zlib1g-dev',
      'libncurses5-dev',
      'libffi-dev',
      'libgdbm5',
      'libgdbm-dev',
    );

    // $ git clone https://github.com/rbenv/rbenv.git ~/.rbenv
    await gitClone('rbenv/rbenv', '~/.rbenv');

    // echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
    await echo('export PATH="$HOME/.rbenv/bin:$PATH"', BASHRC);

    // echo 'eval "$(rbenv init -)"' >> ~/.bashrc
    await echo('eval "$(rbenv init -)"', BASHRC);

    // source ~/.bashrc
    await tryRunCommand('source', BASHRC);

    // git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
    await gitClone('rbenv/ruby-build', '~/.rbenv/plugins/ruby-build');
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }
}

module.exports = async (version = null) => {
  let versionNumber = 0;
  try {
    versionNumber = version || (await getLatestRubyVersion());
  } catch (err) {
    if (err.toString().match(/enoent|not\sfound/i)) {
      await installRBenv();
      await tryRunCommand('rbenv', 'install', versionNumber);
      await tryRunCommand('rbenv', 'global', versionNumber);
    } else {
      throw err;
    }
  }
  // TODO: Add Support for JIT compilation

  return new Promise((resolve, reject) => {
    tryRunCommand('ruby', '-v')
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
