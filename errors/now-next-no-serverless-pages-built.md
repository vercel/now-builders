# `@now/next` No Serverless Pages Built

#### Why This Error Occurred

This error occurs when you have one or more of the following:
 - A misconfigured [Next.JS](https://github.com/zeit/next.js) deployment.
 - No pages detected.

#### Possible Ways to Fix It

If you want to deploy your Next.js application in a serverless environment, make sure you have:

 - `package.json` with Next greater than 8:
```json
{
  "dependencies": {
    "next": "^8.0.0-canary.7"
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
