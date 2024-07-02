const path = require('path');
const fs = require('fs');
const fsPromise = require('fs/promises');
const {
  getUnixPath,
  getAliasName,
  createGetChunkFilename,
} = require('./helper');
const { getBaseConfig } = require('./unbuild-base.config');

export const getTreeShakingConfig = ({
  rootPath,
  mainEntryPath,
  entryPaths,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processRollupOptions = (_ctx, _rollupOptions) => {},
}) => {
  const pathResolve = (...paths) => path.resolve(rootPath, ...paths);
  const outputFolderPath = pathResolve('dist');
  const packageJsonPath = pathResolve('package.json');

  const resolveOutputRelativeUnixPath = (filePath) => {
    const outputPath = path.resolve(outputFolderPath, filePath);
    const result = getUnixPath(path.relative(rootPath, outputPath));

    if (result.startsWith('./')) return result;

    return `./${result}`;
  };

  const removeOutputFolder = async () => {
    // for symlink working, do not remove /dist folder
    // just only remove files in /dist folder
    if (fs.existsSync(outputFolderPath)) {
      const files = await fsPromise.readdir(outputFolderPath);
      const rmPromises = files.map((filename) =>
        fsPromise.rm(path.join(outputFolderPath, filename), {
          recursive: true,
        }),
      );

      return Promise.all(rmPromises);
    }
  };

  const createRootDtsCjsMjsFiles = async () => {
    await Promise.all(
      entryPaths.map(async (entryPath) => {
        const aliasName = getAliasName(mainEntryPath, entryPath);
        const outputRelativeUnixPath = resolveOutputRelativeUnixPath(aliasName);

        // dts
        const dtsFilePath = pathResolve(`${aliasName}.d.ts`);
        const dtsFileContent = `export * from '${outputRelativeUnixPath}';\nexport { default } from '${outputRelativeUnixPath}';`;
        await fsPromise.writeFile(dtsFilePath, dtsFileContent, 'utf-8');
      }),
    );
  };

  const updatePackageJson = async () => {
    const packageJson = await fsPromise.readFile(packageJsonPath, 'utf-8');
    const packageJsonObj = JSON.parse(packageJson);
    const mainFile = resolveOutputRelativeUnixPath('index');

    packageJsonObj.exports = {
      '.': {
        import: `${mainFile}.mjs`,
        require: `${mainFile}.js`,
        types: `${mainFile}.d.ts`,
      },
    };

    // add exports for each functions file
    entryPaths.forEach((entryPath) => {
      const aliasName = getAliasName(mainEntryPath, entryPath);
      const outputRelativeUnixPath = resolveOutputRelativeUnixPath(aliasName);

      packageJsonObj.exports[`./${aliasName}`] = {
        import: `${outputRelativeUnixPath}.mjs`,
        require: `${outputRelativeUnixPath}.js`,
        types: `${outputRelativeUnixPath}.d.ts`,
      };
    });

    await fsPromise.writeFile(
      packageJsonPath,
      JSON.stringify(packageJsonObj, null, 2) + '\n',
      'utf-8',
    );
  };

  const processFiles = async () => {
    await Promise.all([
      removeOutputFolder(),
      createRootDtsCjsMjsFiles(),
      updatePackageJson(),
    ]);
  };

  return {
    ...getBaseConfig(rootPath),
    clean: true,
    hooks: {
      'rollup:options': async (ctx, rollupOptions) => {
        // process files
        await processFiles();

        const input = entryPaths.reduce((aliasInput, entryPath) => {
          const aliasName = getAliasName(mainEntryPath, entryPath);

          aliasInput[aliasName] = entryPath;
          return aliasInput;
        }, {});

        rollupOptions.input = input;

        const getChunkFilename = createGetChunkFilename(ctx);
        const getEntryFilename = createGetChunkFilename(ctx, false);

        const output = [
          {
            dir: outputFolderPath,
            format: 'esm',
            exports: 'named',
            sourcemap: true,
            chunkFileNames: (chunk) => getChunkFilename(chunk, 'mjs'),
            entryFileNames: (chunk) => getEntryFilename(chunk, 'mjs'),
            interop: 'compat',
          },
          {
            dir: outputFolderPath,
            format: 'cjs',
            exports: 'named',
            sourcemap: true,
            chunkFileNames: (chunk) => getChunkFilename(chunk, 'js'),
            entryFileNames: (chunk) => getEntryFilename(chunk, 'js'),
            interop: 'compat',
          },
        ];

        rollupOptions.output = output;

        // warn: unbuild's rollupOptions.external is a function
        const oldExternalFn = rollupOptions.external;
        rollupOptions.external = (id, parentId, isResolved) => {
          let isExternal = false;

          if (typeof oldExternalFn === 'function') {
            isExternal = oldExternalFn.call(
              rollupOptions,
              id,
              parentId,
              isResolved,
            );
          }

          const peerDependencies = Object.keys(ctx.pkg?.peerDependencies || {});

          if (isExternal) return true;
          if (peerDependencies.includes(id)) return true;

          return false;
        };

        await processRollupOptions?.(ctx, rollupOptions);
      },
    },
  };
};
