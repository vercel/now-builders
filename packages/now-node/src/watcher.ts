import { BuildAssets, BuildOutput } from './types';
const ncc = require('@zeit/ncc');

// Based on the NodeWatchFileSystem class at:
// - https://github.com/webpack/webpack/blob/master/lib/node/NodeWatchFileSystem.js
// which in turn exposes:
// - https://www.npmjs.com/package/watchpack
type Timestamps = Map<string, Timestamp | null>;

type ChangeCallback = (
  err: Error | null,
  fileTimestamps: Timestamps,
  contextTimestamps: Timestamps,
  removed: string[]
) => void;

interface Timestamp {
  safeTime?: number;
  accuracy?: number;
  timestamp?: number;
}

interface InputFileSystem {
  purge: (file: string) => void;
}

interface NccOptions {
  watch?: CustomWatchFileSystem;
  sourceMap?: boolean;
  sourceMapRegister?: boolean;
}

interface NccResult {
  watch?: CustomWatchFileSystem;
  sourceMap?: boolean;
  sourceMapRegister?: boolean;
}

interface BuildCallback extends BuildOutput {
  err: Error | void;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let r;
  let j;
  const promise = new Promise<T>(
    (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ): void => {
      r = resolve;
      j = reject;
    }
  );
  if (!r || !j) {
    throw new Error('Failed to create Deferred');
  }
  return { promise, resolve: r, reject: j };
}

class CustomWatchFileSystem {
  private changeCallback?: ChangeCallback;
  private files: Set<string>;
  private dirs: Set<string>;
  private missing: Set<string>;
  private timestamps: Timestamps;
  private code: string;
  private map?: string;
  private assets: BuildAssets;
  private permissions?: number;

  public inputFileSystem: InputFileSystem | undefined;
  public currentBuild: Deferred<BuildOutput>;

  constructor() {
    this.code = '';
    this.assets = {};
    this.currentBuild = createDeferred<BuildOutput>();

    // Webpack requires us to track this stuff
    this.files = new Set();
    this.dirs = new Set();
    this.missing = new Set();
    this.timestamps = new Map();

    // This gets (re)set in the `watch()` callback function
    this.changeCallback = undefined;

    // This will be populated for us by ncc
    this.inputFileSystem = undefined;
  }

  /**
   * Public API function to trigger a rebuild.
   */
  triggerChanges(changed: string[], removed: string[]): void {
    console.error('triggerChanges()', { changed, removed });
    if (!this.inputFileSystem) {
      throw new Error('`inputFileSystem` has not been set');
    }
    if (!this.changeCallback) {
      throw new Error('`changeCallback` has not been set');
    }

    const newTime = Date.now();
    for (const file of changed) {
      this.timestamps.set(file, {
        safeTime: newTime + 10,
        accuracy: 10,
        timestamp: newTime
      });
      this.inputFileSystem.purge(file);
    }

    for (const file of removed) {
      this.timestamps.set(file, null);
      this.inputFileSystem.purge(file);
    }

    this.currentBuild = createDeferred<BuildOutput>();

    this.changeCallback(
      null,
      this.timestamps,
      this.timestamps,
      removed
    );
  }

  /**
   * Invoked by webpack after every rebuild has completed.
   */
  watch(
    files: string[],
    dirs: string[],
    missing: string[],
    startTime: number,
    options: object,
    changeCallback: ChangeCallback
  ) {
    console.error('watch() callback invoked', { files, dirs, missing });
    this.files = new Set(files);
    this.dirs = new Set(dirs);
    this.missing = new Set(missing);

    // empty object indicates "unknown" timestamp
    // (that is, not cached)
    for (const item of files)
      this.timestamps.set(item, {});
    for (const item of dirs)
      this.timestamps.set(item, {});
    // null represents "no file"
    for (const item of missing)
      this.timestamps.set(item, null);

    this.changeCallback = changeCallback;

    setImmediate(() => {
      this.currentBuild.resolve({
        code: this.code,
        map: this.map,
        assets: this.assets,
        permissions: this.permissions,
        watch: files
      });
    });

    return {
      close: () => {
        throw new Error('Not implemented');
      },
      pause: () => {
        throw new Error('Not implemented');
      },
      getFileTimestamps: () => {
        return this.timestamps;
      },
      getContextTimestamps: () => {
        return this.timestamps;
      }
    };
  }

  /**
   * Invoked by `ncc` after every build has completed.
   */
  onBuild({ err, code, map, assets, permissions }: BuildCallback): void {
    console.error('onBuild() callback invoked', { err, code, map, assets, permissions });
    if (err) {
      this.currentBuild.reject(err);
    } else {
      // Save the build results to the watcher, to be resolved once
      // the `watch()` callback is invoked by webpack
      this.code = code;
      this.map = map;
      this.assets = assets;
      this.permissions = permissions;
    }
  }

  /**
   * Invoked by `ncc` once a rebuild has started.
   */
  onRebuild(): void {
    console.error('onRebuild() callback invoked');
  }
}


const watchers: Map<string, CustomWatchFileSystem> = new Map();

function createWatcher(
  input: string,
  options: NccOptions
): CustomWatchFileSystem {
  const watch = new CustomWatchFileSystem();
  const { handler, rebuild } = ncc(input, { ...options, watch });
  handler(watch.onBuild.bind(watch));
  rebuild(watch.onRebuild.bind(watch));
  return watch;
}

export function watcherBuild(
  input: string,
  options: NccOptions,
  filesChanged: string[] = [],
  filesRemoved: string[] = []
): Promise<BuildOutput> {
  let watcher = watchers.get(input);
  if (watcher) {
    console.error('Re-building %j', input);
    watcher.triggerChanges(filesChanged, filesRemoved);
  } else {
    console.error('Building %j for the first time', input);
    watcher = createWatcher(input, options);
    watchers.set(input, watcher);
  }
  return watcher.currentBuild.promise;
}
