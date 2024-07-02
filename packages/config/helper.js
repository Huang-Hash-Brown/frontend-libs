const fs = require('fs');
const path = require('path');

export const isFolder = (filePath) => {
  return fs.lstatSync(filePath).isDirectory();
};

// The public folder is not start with . or _
export const isPublicFolder = (filePath) => {
  if (!isFolder(filePath)) return false;

  const folderName = path.basename(filePath);

  return !folderName.startsWith('.') && !folderName.startsWith('_');
};

// Unify paths with '\' into '/'
export const getUnixPath = (filePath) => {
  return filePath.replace(/\\/g, '/');
};

export const getFileNameWithoutExt = (filePath) => {
  return path.basename(filePath, path.extname(filePath));
};

// input: src/constants/index.ts, output: constants
// input: src/hooks/use-xxx.ts, output: use-xxx
// input: src/hooks/use-xxx/index.ts, output: use-xxx
// input: src/hooks/index.ts, output: hooks
// input: mainEntryPath, output: index
export const getAliasName = (mainEntryPath, filePath) => {
  const fileName = path.basename(filePath);

  if (filePath === mainEntryPath) return 'index';

  if (fileName.match(/^index\./)) {
    const parentFolderName = path.basename(path.dirname(filePath));
    return parentFolderName;
  }

  return getFileNameWithoutExt(filePath);
};

export const createGetChunkFilename = (ctx, withHash = true) => {
  return (chunk, ext) => {
    if (chunk.isDynamicEntry) return `chunks/[name]/[hash].${ext}`;

    return withHash ? `${chunk.name}.[hash].${ext}` : `${chunk.name}.${ext}`;
  };
};

export const createEntryPaths = (paths) => {
  const entryPaths = new Set();
  const inputExts = ['.ts', '.tsx'];

  paths.map((p) => {
    // If this is file
    if (!isFolder(p)) {
      if (inputExts.includes(path.extname(p))) {
        entryPaths.add(p);
        return;
      }
    }

    // If this is folder
    const folderFiles = fs.readdirSync(p);

    folderFiles.forEach((fileName) => {
      const filePath = path.resolve(p, fileName);

      if (isPublicFolder(filePath)) {
        inputExts.find((ext) => {
          const entryPath = path.resolve(filePath, `index${ext}`);

          if (fs.existsSync(entryPath)) {
            entryPaths.add(entryPath);
            return true;
          }

          return false;
        });

        return;
      }

      if (inputExts.includes(path.extname(fileName))) {
        entryPaths.add(filePath);
      }
    });
  });

  return Array.from(entryPaths);
};
