import path from 'path';
import FileFsRef from '../file-fs-ref';
import { File, Files } from '../types';

export interface DownloadedFiles {
  [filePath: string]: FileFsRef
}

const CHUNK_SIZE = 50;

function chunkFilenames(array: string[], chunkSize: number): Array<string[]> {
  const chunks: string[][] = [];
  while (array.length > 0) {
    chunks.push(array.splice(0, chunkSize));
  }
  return chunks;
}

function inSequence(tasks: Array<Promise<void[]>>) {
  return tasks.reduce((promise: Promise<any>, task: any) => promise.then(task), Promise.resolve())
}

async function downloadFile(file: File, fsPath: string): Promise<FileFsRef> {
  const { mode } = file;
  const stream = file.toStream();
  return FileFsRef.fromStream({ mode, stream, fsPath });
}

export default async function download(files: Files, basePath: string): Promise<DownloadedFiles> {
  const files2: DownloadedFiles = {};

  const filenamesChunks = chunkFilenames(Object.keys(files), CHUNK_SIZE);

  const tasks: any[] = filenamesChunks.map(filenames => (): Promise<void[]> => {
    return Promise.all(
      filenames.map(async (name: string) => {
        const file = files[name];
        const fsPath = path.join(basePath, name);
        files2[name] = await downloadFile(file, fsPath);
      }),
    );
  })

  await inSequence(tasks);

  return files2;
};