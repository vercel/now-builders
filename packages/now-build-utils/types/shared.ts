interface File {
    type: string;
    mode: number;
    toStream: () => NodeJS.ReadableStream;
}

interface Files {
    [filePath: string]: File
  }