workflow "Main" {
  on = "push"
  resolves = ["npm run publish-from-github"]
}

action "npm run build" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "run build"
}

action "npm run publish-from-github" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["npm run build"]
  args = "npm run publish-from-github"
  secrets = ["NPM_TOKEN"]
}
