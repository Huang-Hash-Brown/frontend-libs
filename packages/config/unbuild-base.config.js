const path = require('path');
const babel = require('@rollup/plugin-babel');

export const getBaseConfig = (rootPath) => {
  const resolveRootPath = (...paths) => path.resolve(rootPath, ...paths);
  const computeAliases = (basePath, paths) => {
    if (!paths || typeof paths !== 'object') return [];

    const regex = /\*$/;

    const aliases = Object.keys(paths).map((alias) => ({
      alias,
      prefix: alias.replace(regex, ''),
      aliasPaths: paths[alias].map((_path) =>
        path.resolve(basePath, _path.replace(regex, '')),
      ),
    }));

    return aliases;
  };

  const pkg = require(resolveRootPath('package.json'));
  const tsconfig = require(resolveRootPath('tsconfig.json'));
  const paths = tsconfig.compilerOptions.paths;
  const aliases = computeAliases(rootPath, paths);
  const rollupAlias = aliases.reduce((acc, { prefix, aliasPaths }) => {
    acc[prefix.replace(/\/$/, '')] = aliasPaths[0];

    return acc;
  }, {});

  /**
   * [unbuild](https://github.com/unjs/unbuild/blob/main/src/types.ts) Unbuild config option
   */
  return {
    /**
     * Clean the output directory before building.
     */
    clean: true,

    /**
     * Whether to generate declaration files.
     * * `compatible` means "src/index.ts" will generate "dist/index.d.mts", "dist/index.d.cts" and "dist/index.d.ts".
     * * `node16` means "src/index.ts" will generate "dist/index.d.mts" and "dist/index.d.cts".
     * * `true` is equivalent to `compatible`.
     * * `false` will disable declaration generation.
     * * `undefined` will auto detect based on "package.json". If "package.json" has "types" field, it will be `"compatible"`, otherwise `false`.
     */
    declaration: true,

    /**
     * Used to specify which modules or libraries should be considered external dependencies
     * and not included in the final build product.
     */
    externals: Object.keys(pkg.peerDependencies || {}),

    /**
     * Create aliases for module imports to reference modules in code using more concise paths.
     * Allow you to specify an alias for the module path.
     */
    alias: rollupAlias,

    /**
     * [Rollup](https://rollupjs.org/configuration-options) Build Options
     */
    rollup: {
      /**
       * If enabled, unbuild generates a CommonJS build in addition to the ESM build.
       */
      emitCJS: true,

      /**
       * If enabled, unbuild generates CommonJS polyfills for ESM builds.
       */
      cjsBridge: true,

      /**
       * Inline dependencies nor explicitly set in "dependencies" or "peerDependencies" or as marked externals to the bundle.
       */
      inlineDependencies: true,

      /**
       * Terminate the build process when a warning appears
       */
      failOnWarn: false,
    },

    /**
     * Used to define hook functions during the construction process to perform custom operations during specific construction stages.
     * This configuration allows you to insert custom logic during the build process to meet specific requirements or perform additional operations.
     */
    hooks: {
      'rollup:options'(ctx, options) {
        options?.plugins?.push(
          babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
          }),
        );
      },
    },
  };
};

export default getBaseConfig;
