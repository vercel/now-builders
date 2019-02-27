# `@now/next` Builds Uploaded

#### Why This Error Occurred

This error occurs when you have not ignored local Next.js builds from being uploaded.

#### How to Fix It

To fix this error, you can create a [`.nowignore`](https://zeit.co/docs/v2/deployments/ignoring-source-paths/) file with the following contents:

```gitignore
node_modules
.next
```

Once this file is created, you can re-attempt the deploy.

Alternatively, you can delete the `.next/` folder off your file system and re-attempt the deploy.
