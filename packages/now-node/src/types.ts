export interface BuildAsset {
  source: Buffer | string;
  permissions: number;
}

export interface BuildAssets {
  [name: string]: BuildAsset;
}

export interface BuildOutput {
  code: string;
  map?: string;
  assets: BuildAssets;
  permissions?: number;
  watch: string[];
}
