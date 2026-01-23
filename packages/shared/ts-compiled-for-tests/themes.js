"use strict";
export function parseThemeMetaData(rawTheme) {
  const meta_data_block = /.theme-meta ?{([^]*)}/gm.exec(rawTheme)?.[1].trim() || "";
  const regex = /--(\w*): ?['"]([^]*?)['"];?/gi;
  const meta = {};
  let last_result = true;
  while (last_result) {
    last_result = regex.exec(meta_data_block);
    if (last_result) {
      meta[last_result[1]] = last_result[2];
    }
  }
  if (!meta.name || !meta.description) {
    throw new Error(
      "The meta variables meta.name and meta.description must be defined"
    );
  }
  return meta;
}
export const HIDDEN_THEME_PREFIX = "dev_";
//# sourceMappingURL=themes.js.map
