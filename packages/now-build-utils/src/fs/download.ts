import path from 'path';
import FileFsRef from '../file-fs-ref';
import { File, Files } from '../types';

export interface DownloadedFiles {
  [filePath: string]: FileFsRef
}

const CHUNK_SIZE = 50;

function chunkArray(array: Array<any>, chunkSize: number){
  const chunks = [];
  while (array.length) {
    chunks.push(array.splice(0, chunkSize));
  }
  return chunks;
}

function inSequence(tasks: Array<any>) {
  return tasks.reduce((promise, task) => promise.then(task), Promise.resolve())
}

async function downloadFile(file: File, fsPath: string): Promise<FileFsRef> {
  const { mode } = file;
  const stream = file.toStream();
  return FileFsRef.fromStream({ mode, stream, fsPath });
}

export default async function download(files: Files, basePath: string): Promise<DownloadedFiles> {
  const files2: DownloadedFiles = {};

  const filenamesChunks = chunkArray(Object.keys(files), CHUNK_SIZE);

  const tasks = filenamesChunks.map(filenames => () => {
    return Promise.all(
      filenames.map(async (name) => {
        const file = files[name];
        const fsPath = path.join(basePath, name);
        files2[name] = await downloadFile(file, fsPath);
      }),
    );
  })

  await inSequence(tasks);

  return files2;
};