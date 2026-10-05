//@ts-check
import { compile } from "sass";

/**
 * Compile colocated SCSS for the frontend esbuild bundle.
 * CSS modules stay hashed; plain `.scss` side-effect imports become global CSS.
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
