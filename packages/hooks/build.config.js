import { defineBuildConfig } from 'unbuild';
import { getTreeShakingConfig } from '../config/unbuild-tree-shaking.config';
import { createEntryPaths } from '../config/helper';

const path = require('path');

const rootPath = __dirname;
const pathResolve = (...paths) => path.resolve(rootPath, ...paths);

export default defineBuildConfig({
  ...getTreeShakingConfig({
    rootPath,
    mainEntryPath: pathResolve('./src/index.ts'),
    entryPaths: createEntryPaths([pathResolve('./src')]),
  }),
});
