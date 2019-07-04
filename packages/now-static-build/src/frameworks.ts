export default [
    {
        name: 'Gatsby.js',
        dependency: 'gatsby',
        output: 'public'
    },
    {
        name: 'Svelte',
        dependency: 'svelte',
        output: 'public',
        defaultRoutes: [
            {
                handle: 'filesystem'
            },
            {
                src: '/(.*)',
                dest: '/index.html'
            }
        ]
    },
    {
        name: 'Create React App',
        dependency: 'react-scripts',
        output: 'build',
        defaultRoutes: [
            {
                src: '/static/(.*)',
                headers: { 'cache-control': 's-maxage=31536000, immutable' },
                dest: '/static/$1'
            },
            {
                src: '/favicon.ico',
                dest: '/favicon.ico'
            },
            {
                src: '/asset-manifest.json',
                dest: '/asset-manifest.json'
            },
            {
                src: '/manifest.json',
                dest: '/manifest.json'
            },
            {
                src: '/precache-manifest.(.*)',
                dest: '/precache-manifest.$1'
            },
            {
                src: '/service-worker.js',
                headers: { 'cache-control': 's-maxage=0' },
                dest: '/service-worker.js'
            },
            {
                src: '/sockjs-node/(.*)',
                dest: '/sockjs-node/$1'
            },
            {
                src: '/(.*)',
                headers: { 'cache-control': 's-maxage=0' },
                dest: '/index.html'
            }
        ]
    }
];
