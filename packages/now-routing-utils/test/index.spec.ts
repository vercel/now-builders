import assert from 'assert'
import Ajv from 'ajv'
import {
  normalizeRoutes,
  NowError,
  Route,
  Source,
  isHandler,
  schema,
} from '../lib'

const ajv = new Ajv()
const assertValid = (routes: Route[]) => {
  const validate = ajv.compile(schema)
  const valid = validate(routes)

  if (!valid) console.log(validate.errors)
  assert.equal(valid, true)
}
const assertError = (routes: Route[], errors: Ajv.ErrorObject[]) => {
  const validate = ajv.compile(schema)
  const valid = validate(routes)

  assert.equal(valid, false)
  assert.deepEqual(validate.errors, errors)
}

describe('normalizeRoutes', () => {
  it('accepts valid routes', () => {
    const routes: Route[] = [
      { src: '^/about$' },
      {
        src: '^/blog$',
        methods: ['GET'],
        headers: { 'Cache-Control': 'no-cache' },
        dest: '/blog',
      },
      { handle: 'filesystem' },
      { src: '^/(?<slug>[^/]+)$', dest: 'blog?slug=$slug' },
    ]

    assertValid(routes)

    const normalized = normalizeRoutes(routes)
    assert.equal(normalized.error, null)
    assert.deepStrictEqual(normalized.routes, routes)
  })

  it('normalizes src', () => {
    const expected = '^/about$',
      expected2 = '^\\/about$'
    const sources: Source[] = [
      { src: '/about' },
      { src: '/about$' },
      { src: '\\/about' },
      { src: '\\/about$' },
      { src: '^/about' },
      { src: '^/about$' },
      { src: '^\\/about' },
      { src: '^\\/about$' },
    ]

    assertValid(sources)

    const normalized = normalizeRoutes(sources)

    assert.equal(normalized.error, null)
    assert.notEqual(normalized.routes, null)

    if (normalized.routes) {
      normalized.routes.forEach(route => {
        if (isHandler(route)) {
          assert.fail(
            `Normalizer returned: { handle: ${
              route.handle
            } } instead of { src: ${expected} }`
          )
        } else {
          assert.ok(route.src === expected || route.src === expected2)
        }
      })
    }
  })

  it('returns if null', () => {
    const input = null
    const { error, routes } = normalizeRoutes(input)

    assert.strictEqual(error, null)
    assert.strictEqual(routes, input)
  })

  it('returns if empty', () => {
    const input: Route[] = []
    const { error, routes } = normalizeRoutes(input)

    assert.strictEqual(error, null)
    assert.strictEqual(routes, input)
  })

  it('fails with abnormal routes', () => {
    const errors: NowError['errors'] = []
    const routes: Route[] = []

    routes.push({ handle: 'doesnotexist' })
    errors.push({
      message: 'This is not a valid handler (handle: doesnotexist)',
      handle: 'doesnotexist',
    })

    // @ts-ignore
    routes.push({ handle: 'filesystem', illegal: true })
    errors.push({
      message:
        'Cannot have any other keys when handle is used (handle: filesystem)',
      handle: 'filesystem',
    })

    routes.push({ handle: 'filesystem' })
    errors.push({
      message: 'You can only handle something once (handle: filesystem)',
      handle: 'filesystem',
    })

    routes.push({ src: '^/about$', dest: '/about', continue: true })
    errors.push({
      message: 'Cannot use both continue and dest',
      src: '^/about$',
    })

    routes.push({ src: '^/(broken]$' })
    errors.push({
      message: 'Invalid regular expression: "^/(broken]$"',
      src: '^/(broken]$',
    })

    // @ts-ignore
    routes.push({ doesNotExist: true })
    errors.push({
      message: 'A route must set either handle or src',
    })

    // @ts-ignore
    routes.push({ src: '^/about$', doesNotExist: true })

    const normalized = normalizeRoutes(routes)

    assert.deepStrictEqual(normalized.routes, routes)
    assert.deepStrictEqual(normalized.error, {
      code: 'invalid_routes',
      message: `One or more invalid routes were found: \n${JSON.stringify(
        errors,
        null,
        2
      )}`,
      errors,
    })
  })

  it('fails with invalid routes', () => {
    // @ts-ignore
    assertError('string', [
      {
        dataPath: '',
        keyword: 'type',
        message: 'should be array',
        params: {
          type: 'array',
        },
        schemaPath: '#/type',
      },
    ])

    const arr = []
    for (let i = 0; i < 1026; i++) {
      arr.push(true)
    }

    // @ts-ignore
    assertError(arr, [
      {
        dataPath: '',
        keyword: 'maxItems',
        message: 'should NOT have more than 1024 items',
        params: {
          limit: '1024',
        },
        schemaPath: '#/maxItems',
      },
    ])

    assertError(
      [
        // @ts-ignore
        {
          src: false,
        },
      ],
      [
        {
          dataPath: '[0].src',
          keyword: 'type',
          message: 'should be string',
          params: {
            type: 'string',
          },
          schemaPath: '#/items/properties/src/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          dest: false,
        },
      ],
      [
        {
          dataPath: '[0].dest',
          keyword: 'type',
          message: 'should be string',
          params: {
            type: 'string',
          },
          schemaPath: '#/items/properties/dest/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          methods: false,
        },
      ],
      [
        {
          dataPath: '[0].methods',
          keyword: 'type',
          message: 'should be array',
          params: {
            type: 'array',
          },
          schemaPath: '#/items/properties/methods/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          methods: [false],
        },
      ],
      [
        {
          dataPath: '[0].methods[0]',
          keyword: 'type',
          message: 'should be string',
          params: {
            type: 'string',
          },
          schemaPath: '#/items/properties/methods/items/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          headers: false,
        },
      ],
      [
        {
          dataPath: '[0].headers',
          keyword: 'type',
          message: 'should be object',
          params: {
            type: 'object',
          },
          schemaPath: '#/items/properties/headers/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          headers: {
            test: false,
          },
        },
      ],
      [
        {
          dataPath: "[0].headers['test']",
          keyword: 'type',
          message: 'should be string',
          params: {
            type: 'string',
          },
          schemaPath:
            '#/items/properties/headers/patternProperties/%5E.%7B1%2C256%7D%24/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          handle: false,
        },
      ],
      [
        {
          dataPath: '[0].handle',
          keyword: 'type',
          message: 'should be string',
          params: {
            type: 'string',
          },
          schemaPath: '#/items/properties/handle/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          continue: 'false',
        },
      ],
      [
        {
          dataPath: '[0].continue',
          keyword: 'type',
          message: 'should be boolean',
          params: {
            type: 'boolean',
          },
          schemaPath: '#/items/properties/continue/type',
        },
      ]
    )

    assertError(
      [
        // @ts-ignore
        {
          status: '404',
        },
      ],
      [
        {
          dataPath: '[0].status',
          keyword: 'type',
          message: 'should be integer',
          params: {
            type: 'integer',
          },
          schemaPath: '#/items/properties/status/type',
        },
      ]
    )

    assertError(
      [
        {
          // @ts-ignore
          doesNotExist: false,
        },
      ],
      [
        {
          dataPath: '[0]',
          keyword: 'additionalProperties',
          message: 'should NOT have additional properties',
          params: {
            additionalProperty: 'doesNotExist',
          },
          schemaPath: '#/items/additionalProperties',
        },
      ]
    )
  })
})
