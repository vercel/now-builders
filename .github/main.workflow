workflow "Main" {
  on = "push"
  resolves = ["3. npm run publish-from-github"]
}

action "1. npm install" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "install"
}

action "2. npm run build" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["1. npm install"]
  args = "run build"
}

action "3. npm run publish-from-github" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["2. npm run build"]
  args = "run publish-from-github"
  secrets = ["NPM_TOKEN"]
}
