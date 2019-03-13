const cli = require('./cli');

const PIPE = '|';
const BASHRC = '~/.bashrc';

async function gitClone(repoPath, destDir) {
  try {
    await cli('git', 'clone', `https://github.com/${repoPath}.git`, destDir);
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }
}

async function echo(msg, redirectionPath = null) {
  try {
    await cli('echo', msg, `>> ${redirectionPath}`);
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }
}

// $ rbenv install -l | egrep "\s[0-9]\.[0-9]\.[0-9]$" | tail -1
async function getLatestRubyVersion() {
  try {
    await cli(
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
    await cli('sudo apt-get update');
    await cli(
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
    await cli('source', BASHRC);

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
      await cli('rbenv', 'install', versionNumber);
      await cli('rbenv', 'global', versionNumber);

      // Env for apps
      await echo('export RACK_ENV=production', BASHRC); // Generic for all Rack apps
      await echo('export RAILS_ENV="$RACK_ENV"', BASHRC); // ROR
      await echo('export APP_ENV="$RACK_ENV"', BASHRC); // Sinatra
      await echo('export RAILS_LOG_TO_STDOUT=true', BASHRC); // ROR
    } else {
      throw err;
    }
  }
  // TODO: Add Support for JIT compilation

  return new Promise((resolve, reject) => {
    cli('ruby', '-v')
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
