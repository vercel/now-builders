# now-routing-utils

[![codecov](https://codecov.io/gh/zeit/api-now/branch/master/graph/badge.svg?token=jk5xdJggGH)](https://codecov.io/gh/zeit/api-now)

Route validation utilities

## Usage

`yarn add @zeit/now-routing-utils`

exports.normalizeRoutes:
`(routes: Array<Route> | null) => { routes: Array<Route> | null; error: NowError | null }`

exports.schema:

```
const ajv = new Ajv()
const validate = ajv.compile(schema)
const valid = validate([
  { src: '/about', dest: '/about.html' },
])

if (!valid) console.log(validate.errors)
```

## Development

`yarn build` and `yarn watch`

## Testing

`yarn test`

With coverage: `yarn coverage`

## Linting

`yarn lint-fix`

Only check: `yarn lint`

## Publishing

`yarn publish`

Will automatically run build and run tests
