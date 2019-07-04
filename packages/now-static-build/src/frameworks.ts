import { readdir } from 'fs';
import { promisify } from 'util';
import { join } from 'path';

const readirPromise = promisify(readdir);

export default [
  {
    name: 'Gatsby.js',
    dependency: 'gatsby',
    getOutputDirName: () => 'public',
  },
  {
    name: 'Vue.js',
    dependency: 'vue',
    getOutputDirName: () => 'dist',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '^/js/(.*)',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
        dest: '/js/$1',
      },
      {
        src: '^/css/(.*)',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
        dest: '/css/$1',
      },
      {
        src: '^/img/(.*)',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
        dest: '/img/$1',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Angular',
    dependency: '@angular/core',
    getOutputDirName: async dirPrefix => {
      const base = 'dist';
      const location = join(dirPrefix, base);
      const content = await readirPromise(location);

      return join(base, content[0]);
    },
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Svelte',
    dependency: 'svelte',
    getOutputDirName: () => 'public',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Create React App',
    dependency: 'react-scripts',
    getOutputDirName: () => 'build',
    defaultRoutes: [
      {
        src: '/static/(.*)',
        headers: { 'cache-control': 's-maxage=31536000, immutable' },
        dest: '/static/$1',
      },
      {
        src: '/favicon.ico',
        dest: '/favicon.ico',
      },
      {
        src: '/asset-manifest.json',
        dest: '/asset-manifest.json',
      },
      {
        src: '/manifest.json',
        dest: '/manifest.json',
      },
      {
        src: '/precache-manifest.(.*)',
        dest: '/precache-manifest.$1',
      },
      {
        src: '/service-worker.js',
        headers: { 'cache-control': 's-maxage=0' },
        dest: '/service-worker.js',
      },
      {
        src: '/sockjs-node/(.*)',
        dest: '/sockjs-node/$1',
      },
      {
        src: '/(.*)',
        headers: { 'cache-control': 's-maxage=0' },
        dest: '/index.html',
      },
    ],
  },
];
