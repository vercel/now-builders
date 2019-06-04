import { ZipFile } from 'yazl';
import { fromBuffer, Entry } from 'yauzl-promise';
import { readlink } from 'fs-extra';
import { Files } from './types';
import FileFsRef from './file-fs-ref';
import { isSymbolicLink } from './fs/download';
import streamToBuffer from './fs/stream-to-buffer';

const mtime = new Date(1540000000000);

export async function createZip(files: Files): Promise<Buffer> {
	const names = Object.keys(files).sort();

	const symlinkTargets = new Map<string, string>();
	for (const name of names) {
		const file = files[name];
		if (
			file.mode &&
			isSymbolicLink(file.mode) &&
			file.type === 'FileFsRef'
		) {
			const symlinkTarget = await readlink((file as FileFsRef).fsPath);
			symlinkTargets.set(name, symlinkTarget);
		}
	}

	const zipFile = new ZipFile();
	const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
		for (const name of names) {
			const file = files[name];
			const opts = { mode: file.mode, mtime };
			const symlinkTarget = symlinkTargets.get(name);
			if (typeof symlinkTarget === 'string') {
				zipFile.addBuffer(
					Buffer.from(symlinkTarget, 'utf8'),
					name,
					opts
				);
			} else {
				const stream = file.toStream() as import('stream').Readable;
				stream.on('error', reject);
				zipFile.addReadStream(stream, name, opts);
			}
		}

		zipFile.end();
		streamToBuffer(zipFile.outputStream)
			.then(resolve)
			.catch(reject);
	});

	return zipBuffer;
}

export async function createFiles(
	stream: NodeJS.ReadableStream
): Promise<Files> {
	const files: Files = {};
	const buffer = await streamToBuffer(stream);
	const zipFile = await fromBuffer(buffer);
	let entry: Entry;
	while ((entry = await zipFile.readEntry()) !== null) {
		const stream = await zipFile.openReadStream(entry);
		const fsPath = entry.fileName;
		const mode = entry.externalFileAttributes >>> 16;
		const file = await FileFsRef.fromStream({ mode, stream, fsPath });
		files[fsPath] = file;
	}
	zipFile.on('end', () => {
		console.log(`created ${Object.keys(files).length} files`);
	});
	await zipFile.close();
	return files;
}
