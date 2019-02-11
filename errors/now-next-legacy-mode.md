# `@now/next` Legacy Mode

#### Why This Warning Occurred

`@now/next` has two modes: `legacy` and `serverless`. You will always want to use the `serverless` mode. `legacy` is to provide backwards compatibility with previous `@now/next` versions.

The differences:

Legacy:

- Minimal lambda size of `2.2Mb` (approximately)
- Forces `next@v7.0.2-canary.49` and `next-server@v7.0.2-canary.49`
- Forces all `dependencies` to be `devDependencies`
- Loads `next.config.js` on bootup, breaking sometimes when users didn't use `phases` to load files
- Used `next-server` which is the full Next.js server with routing etc.
- Runs `npm install`
- Runs `npm run now-build`
- Runs `npm install --production` after build

Serverless:

- Minimal lambda size of `49Kb` (approximately)
- Uses Next.js build targets (`target: 'serverless'`) in `next.config.js`. [documentation](https://github.com/zeit/next.js#summary)
- Does not make changes to your application dependencies
- Does not load `next.config.js` ([as per the serverless target documentation](https://github.com/zeit/next.js#summary))
- Runs `npm install`
- Runs `npm run now-build`
- Does not run `npm install --production` as the output from the build is all that's needed to bundle lambdas.
- No runtime dependencies, meaning smaller lambda functions
- Optimized for fast [cold start](https://zeit.co/blog/serverless-ssr#cold-start)


#### Possible Ways to Fix It

In order to create the smallest possible lambdas Next.js has to be configured to build for the `serverless` target.

1. Add the `now-build` script to your `package.json`

```json
{
  "scripts": {
    "now-build": "next build"
  },
}
```

2. Add `target: 'serverless'` to `next.config.js`

```js
module.exports = {
  target: 'serverless'
  // Other options are still valid
}
```

3. Optionally make sure the `"src"` in `"builds"` points to your application `package.json`

```js
{
  "version": 2,
  "builds": [{ "src": "package.json", "use": "@now/next" }]
}
```

PS: Make sure you have a Next.js version greater than 8 as a dependencie in your `package.json`.

### Useful Links

- [Serverless target implementation](https://github.com/zeit/now-builders/pull/150) 
