import { compile } from "sass";

/**
 * Compile both scoped CSS modules and global component SCSS imports.
 *
 * @type {import("esbuild").Plugin}
 */
export const sassPlugin = {
  name: "sass",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, (args) => {
      const { css } = compile(args.path);
      return {
        contents: css,
        loader: args.path.endsWith(".module.scss") ? "local-css" : "css",
      };
    });
  },
};
