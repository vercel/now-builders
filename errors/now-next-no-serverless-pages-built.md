# `@now/next` No Serverless Pages Built

#### Why This Error Occurred

This error occurs when you have your application is not configured for Serverless Next.js build output.

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
