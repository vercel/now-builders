    await fs.writeJson(
      currentManifestPath,
      Object.assign(currentManifest, {
        pages: Object.assign(pages, { [recallPageKey]: recallPage }),
        pageChunks: Object.assign(pageChunks, {
          [recallPageKey]: movedPageChunks,
        }),
        hashes: Object.assign(
          hashes,
          recallPage.reduce(
            (acc, cur) => Object.assign(acc, { [cur]: recallHashes[cur] }),
            {},
          ),
        ),
      }),
    );
