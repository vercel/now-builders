# `@now/next` Legacy Mode

#### Why This Warning Occurred

This warning occurs when a deployment without `"target": serverless` is built.

#### Possible Ways to Fix It

If you want to deploy your Next.js application in a serverless environment, make sure you have:

 - `package.json` with Next.js greater than 8:
```json
{
  "dependencies": {
    "next": "^8.0.0-canary.13"
  },
}
```

_PS: `"react"` and `"react-dom"` still needs to be present_

 - `package.json` with `"now-build"` in scripts:
```json
{
  "scripts": {
    "now-build": "next build"
  },
}
```

 - `next.config.js` with `target:'serverless'`:
```js
module.exports = {
  target: 'serverless'
}
```

 - `now.json` with the right `"builds"` entry:

```js
{
  "version": 2,
  "builds": [{ "src": "package.json", "use": "@now/next" }]
}
```

### Useful Links

- [Serverless Deployment with Next.js](https://github.com/zeit/next.js#serverless-deployment)
