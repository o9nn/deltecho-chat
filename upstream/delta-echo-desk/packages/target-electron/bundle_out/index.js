const __create = Object.create;
const __defProp = Object.defineProperty;
const __getOwnPropDesc = Object.getOwnPropertyDescriptor;
const __getOwnPropNames = Object.getOwnPropertyNames;
const __getProtoOf = Object.getPrototypeOf;
const __hasOwnProp = Object.prototype.hasOwnProperty;
const __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
const __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
const __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
const __export = (target, all) => {
  for (const name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
const __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (const key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
const __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cjs-shim.ts
import { createRequire } from "node:module";
import path from "node:path";
import url from "node:url";
const init_cjs_shim = __esm({
  "src/cjs-shim.ts"() {
    "use strict";
    globalThis.require = createRequire(import.meta.url);
    globalThis.__filename = url.fileURLToPath(import.meta.url);
    globalThis.__dirname = path.dirname(__filename);
  }
});

// ../../node_modules/.pnpm/ini@1.3.8/node_modules/ini/ini.js
const require_ini = __commonJS({
  "../../node_modules/.pnpm/ini@1.3.8/node_modules/ini/ini.js"(exports) {
    init_cjs_shim();
    exports.parse = exports.decode = decode;
    exports.stringify = exports.encode = encode;
    exports.safe = safe;
    exports.unsafe = unsafe;
    const eol = typeof process !== "undefined" && process.platform === "win32" ? "\r\n" : "\n";
    function encode(obj, opt) {
      const children = [];
      let out = "";
      if (typeof opt === "string") {
        opt = {
          section: opt,
          whitespace: false
        };
      } else {
        opt = opt || {};
        opt.whitespace = opt.whitespace === true;
      }
      const separator = opt.whitespace ? " = " : "=";
      Object.keys(obj).forEach(function(k, _, __) {
        const val = obj[k];
        if (val && Array.isArray(val)) {
          val.forEach(function(item) {
            out += safe(k + "[]") + separator + safe(item) + "\n";
          });
        } else if (val && typeof val === "object")
          children.push(k);
        else
          out += safe(k) + separator + safe(val) + eol;
      });
      if (opt.section && out.length)
        out = "[" + safe(opt.section) + "]" + eol + out;
      children.forEach(function(k, _, __) {
        const nk = dotSplit(k).join("\\.");
        const section = (opt.section ? opt.section + "." : "") + nk;
        const child = encode(obj[k], {
          section,
          whitespace: opt.whitespace
        });
        if (out.length && child.length)
          out += eol;
        out += child;
      });
      return out;
    }
    function dotSplit(str) {
      return str.replace(/\1/g, "LITERAL\\1LITERAL").replace(/\\\./g, "").split(/\./).map(function(part) {
        return part.replace(/\1/g, "\\.").replace(/\2LITERAL\\1LITERAL\2/g, "");
      });
    }
    function decode(str) {
      const out = {};
      let p = out;
      let section = null;
      const re = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i;
      const lines = str.split(/[\r\n]+/g);
      lines.forEach(function(line, _, __) {
        if (!line || line.match(/^\s*[;#]/))
          return;
        const match = line.match(re);
        if (!match)
          return;
        if (match[1] !== void 0) {
          section = unsafe(match[1]);
          if (section === "__proto__") {
            p = {};
            return;
          }
          p = out[section] = out[section] || {};
          return;
        }
        let key = unsafe(match[2]);
        if (key === "__proto__")
          return;
        let value = match[3] ? unsafe(match[4]) : true;
        switch (value) {
          case "true":
          case "false":
          case "null":
            value = JSON.parse(value);
        }
        if (key.length > 2 && key.slice(-2) === "[]") {
          key = key.substring(0, key.length - 2);
          if (key === "__proto__")
            return;
          if (!p[key])
            p[key] = [];
          else if (!Array.isArray(p[key]))
            p[key] = [p[key]];
        }
        if (Array.isArray(p[key]))
          p[key].push(value);
        else
          p[key] = value;
      });
      Object.keys(out).filter(function(k, _, __) {
        if (!out[k] || typeof out[k] !== "object" || Array.isArray(out[k]))
          return false;
        const parts = dotSplit(k);
        let p2 = out;
        const l = parts.pop();
        const nl = l.replace(/\\\./g, ".");
        parts.forEach(function(part, _2, __2) {
          if (part === "__proto__")
            return;
          if (!p2[part] || typeof p2[part] !== "object")
            p2[part] = {};
          p2 = p2[part];
        });
        if (p2 === out && nl === l)
          return false;
        p2[nl] = out[k];
        return true;
      }).forEach(function(del, _, __) {
        delete out[del];
      });
      return out;
    }
    function isQuoted(val) {
      return val.charAt(0) === '"' && val.slice(-1) === '"' || val.charAt(0) === "'" && val.slice(-1) === "'";
    }
    function safe(val) {
      return typeof val !== "string" || val.match(/[=\r\n]/) || val.match(/^\[/) || val.length > 1 && isQuoted(val) || val !== val.trim() ? JSON.stringify(val) : val.replace(/;/g, "\\;").replace(/#/g, "\\#");
    }
    function unsafe(val, doUnesc) {
      val = (val || "").trim();
      if (isQuoted(val)) {
        if (val.charAt(0) === "'")
          val = val.substr(1, val.length - 2);
        try {
          val = JSON.parse(val);
        } catch (_) {
        }
      } else {
        let esc = false;
        let unesc = "";
        for (let i = 0, l = val.length; i < l; i++) {
          const c = val.charAt(i);
          if (esc) {
            if ("\\;#".indexOf(c) !== -1)
              unesc += c;
            else
              unesc += "\\" + c;
            esc = false;
          } else if (";#".indexOf(c) !== -1)
            break;
          else if (c === "\\")
            esc = true;
          else
            unesc += c;
        }
        if (esc)
          unesc += "\\";
        return unesc.trim();
      }
      return val;
    }
  }
});

// ../../node_modules/.pnpm/strip-json-comments@2.0.1/node_modules/strip-json-comments/index.js
const require_strip_json_comments = __commonJS({
  "../../node_modules/.pnpm/strip-json-comments@2.0.1/node_modules/strip-json-comments/index.js"(exports, module) {
    "use strict";
    init_cjs_shim();
    const singleComment = 1;
    const multiComment = 2;
    function stripWithoutWhitespace() {
      return "";
    }
    function stripWithWhitespace(str, start, end) {
      return str.slice(start, end).replace(/\S/g, " ");
    }
    module.exports = function(str, opts) {
      opts = opts || {};
      let currentChar;
      let nextChar;
      let insideString = false;
      let insideComment = false;
      let offset = 0;
      let ret = "";
      const strip = opts.whitespace === false ? stripWithoutWhitespace : stripWithWhitespace;
      for (let i = 0; i < str.length; i++) {
        currentChar = str[i];
        nextChar = str[i + 1];
        if (!insideComment && currentChar === '"') {
          const escaped = str[i - 1] === "\\" && str[i - 2] !== "\\";
          if (!escaped) {
            insideString = !insideString;
          }
        }
        if (insideString) {
          continue;
        }
        if (!insideComment && currentChar + nextChar === "//") {
          ret += str.slice(offset, i);
          offset = i;
          insideComment = singleComment;
          i++;
        } else if (insideComment === singleComment && currentChar + nextChar === "\r\n") {
          i++;
          insideComment = false;
          ret += strip(str, offset, i);
          offset = i;
          continue;
        } else if (insideComment === singleComment && currentChar === "\n") {
          insideComment = false;
          ret += strip(str, offset, i);
          offset = i;
        } else if (!insideComment && currentChar + nextChar === "/*") {
          ret += str.slice(offset, i);
          offset = i;
          insideComment = multiComment;
          i++;
          continue;
        } else if (insideComment === multiComment && currentChar + nextChar === "*/") {
          i++;
          insideComment = false;
          ret += strip(str, offset, i + 1);
          offset = i + 1;
          continue;
        }
      }
      return ret + (insideComment ? strip(str.substr(offset)) : str.substr(offset));
    };
  }
});

// ../../node_modules/.pnpm/rc@1.2.8/node_modules/rc/lib/utils.js
const require_utils = __commonJS({
  "../../node_modules/.pnpm/rc@1.2.8/node_modules/rc/lib/utils.js"(exports) {
    "use strict";
    init_cjs_shim();
    const fs2 = __require("fs");
    const ini = require_ini();
    const path4 = __require("path");
    const stripJsonComments = require_strip_json_comments();
    const parse = exports.parse = function(content) {
      if (/^\s*{/.test(content))
        return JSON.parse(stripJsonComments(content));
      return ini.parse(content);
    };
    const file = exports.file = function() {
      const args = [].slice.call(arguments).filter(function(arg) {
        return arg != null;
      });
      for (const i in args)
        if ("string" !== typeof args[i])
          return;
      const file2 = path4.join.apply(null, args);
      let content;
      try {
        return fs2.readFileSync(file2, "utf-8");
      } catch (err) {
        return;
      }
    };
    const json = exports.json = function() {
      const content = file.apply(null, arguments);
      return content ? parse(content) : null;
    };
    const env = exports.env = function(prefix, env2) {
      env2 = env2 || process.env;
      const obj = {};
      const l = prefix.length;
      for (var k in env2) {
        if (k.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
          var keypath = k.substring(l).split("__");
          var _emptyStringIndex;
          while ((_emptyStringIndex = keypath.indexOf("")) > -1) {
            keypath.splice(_emptyStringIndex, 1);
          }
          var cursor = obj;
          keypath.forEach(function _buildSubObj(_subkey, i) {
            if (!_subkey || typeof cursor !== "object")
              return;
            if (i === keypath.length - 1)
              cursor[_subkey] = env2[k];
            if (cursor[_subkey] === void 0)
              cursor[_subkey] = {};
            cursor = cursor[_subkey];
          });
        }
      }
      return obj;
    };
    const find = exports.find = function() {
      const rel = path4.join.apply(null, [].slice.call(arguments));
      function find2(start, rel2) {
        const file2 = path4.join(start, rel2);
        try {
          fs2.statSync(file2);
          return file2;
        } catch (err) {
          if (path4.dirname(start) !== start)
            return find2(path4.dirname(start), rel2);
        }
      }
      return find2(process.cwd(), rel);
    };
  }
});

// ../../node_modules/.pnpm/deep-extend@0.6.0/node_modules/deep-extend/lib/deep-extend.js
const require_deep_extend = __commonJS({
  "../../node_modules/.pnpm/deep-extend@0.6.0/node_modules/deep-extend/lib/deep-extend.js"(exports, module) {
    "use strict";
    init_cjs_shim();
    function isSpecificValue(val) {
      return val instanceof Buffer || val instanceof Date || val instanceof RegExp ? true : false;
    }
    function cloneSpecificValue(val) {
      if (val instanceof Buffer) {
        const x = Buffer.alloc ? Buffer.alloc(val.length) : new Buffer(val.length);
        val.copy(x);
        return x;
      } else if (val instanceof Date) {
        return new Date(val.getTime());
      } else if (val instanceof RegExp) {
        return new RegExp(val);
      } else {
        throw new Error("Unexpected situation");
      }
    }
    function deepCloneArray(arr) {
      const clone = [];
      arr.forEach(function(item, index) {
        if (typeof item === "object" && item !== null) {
          if (Array.isArray(item)) {
            clone[index] = deepCloneArray(item);
          } else if (isSpecificValue(item)) {
            clone[index] = cloneSpecificValue(item);
          } else {
            clone[index] = deepExtend({}, item);
          }
        } else {
          clone[index] = item;
        }
      });
      return clone;
    }
    function safeGetProperty(object, property) {
      return property === "__proto__" ? void 0 : object[property];
    }
    var deepExtend = module.exports = function() {
      if (arguments.length < 1 || typeof arguments[0] !== "object") {
        return false;
      }
      if (arguments.length < 2) {
        return arguments[0];
      }
      const target = arguments[0];
      const args = Array.prototype.slice.call(arguments, 1);
      let val, src, clone;
      args.forEach(function(obj) {
        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
          return;
        }
        Object.keys(obj).forEach(function(key) {
          src = safeGetProperty(target, key);
          val = safeGetProperty(obj, key);
          if (val === target) {
            return;
          } else if (typeof val !== "object" || val === null) {
            target[key] = val;
            return;
          } else if (Array.isArray(val)) {
            target[key] = deepCloneArray(val);
            return;
          } else if (isSpecificValue(val)) {
            target[key] = cloneSpecificValue(val);
            return;
          } else if (typeof src !== "object" || src === null || Array.isArray(src)) {
            target[key] = deepExtend({}, val);
            return;
          } else {
            target[key] = deepExtend(src, val);
            return;
          }
        });
      });
      return target;
    };
  }
});

// ../../node_modules/.pnpm/minimist@1.2.6/node_modules/minimist/index.js
const require_minimist = __commonJS({
  "../../node_modules/.pnpm/minimist@1.2.6/node_modules/minimist/index.js"(exports, module) {
    init_cjs_shim();
    module.exports = function(args, opts) {
      if (!opts)
        opts = {};
      const flags = { bools: {}, strings: {}, unknownFn: null };
      if (typeof opts["unknown"] === "function") {
        flags.unknownFn = opts["unknown"];
      }
      if (typeof opts["boolean"] === "boolean" && opts["boolean"]) {
        flags.allBools = true;
      } else {
        [].concat(opts["boolean"]).filter(Boolean).forEach(function(key2) {
          flags.bools[key2] = true;
        });
      }
      const aliases = {};
      Object.keys(opts.alias || {}).forEach(function(key2) {
        aliases[key2] = [].concat(opts.alias[key2]);
        aliases[key2].forEach(function(x) {
          aliases[x] = [key2].concat(aliases[key2].filter(function(y) {
            return x !== y;
          }));
        });
      });
      [].concat(opts.string).filter(Boolean).forEach(function(key2) {
        flags.strings[key2] = true;
        if (aliases[key2]) {
          flags.strings[aliases[key2]] = true;
        }
      });
      const defaults2 = opts["default"] || {};
      const argv = { _: [] };
      Object.keys(flags.bools).forEach(function(key2) {
        setArg(key2, defaults2[key2] === void 0 ? false : defaults2[key2]);
      });
      let notFlags = [];
      if (args.indexOf("--") !== -1) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
      }
      function argDefined(key2, arg2) {
        return flags.allBools && /^--[^=]+$/.test(arg2) || flags.strings[key2] || flags.bools[key2] || aliases[key2];
      }
      function setArg(key2, val, arg2) {
        if (arg2 && flags.unknownFn && !argDefined(key2, arg2)) {
          if (flags.unknownFn(arg2) === false)
            return;
        }
        const value2 = !flags.strings[key2] && isNumber(val) ? Number(val) : val;
        setKey(argv, key2.split("."), value2);
        (aliases[key2] || []).forEach(function(x) {
          setKey(argv, x.split("."), value2);
        });
      }
      function setKey(obj, keys, value2) {
        let o = obj;
        for (let i2 = 0; i2 < keys.length - 1; i2++) {
          var key2 = keys[i2];
          if (isConstructorOrProto(o, key2))
            return;
          if (o[key2] === void 0)
            o[key2] = {};
          if (o[key2] === Object.prototype || o[key2] === Number.prototype || o[key2] === String.prototype)
            o[key2] = {};
          if (o[key2] === Array.prototype)
            o[key2] = [];
          o = o[key2];
        }
        var key2 = keys[keys.length - 1];
        if (isConstructorOrProto(o, key2))
          return;
        if (o === Object.prototype || o === Number.prototype || o === String.prototype)
          o = {};
        if (o === Array.prototype)
          o = [];
        if (o[key2] === void 0 || flags.bools[key2] || typeof o[key2] === "boolean") {
          o[key2] = value2;
        } else if (Array.isArray(o[key2])) {
          o[key2].push(value2);
        } else {
          o[key2] = [o[key2], value2];
        }
      }
      function aliasIsBoolean(key2) {
        return aliases[key2].some(function(x) {
          return flags.bools[x];
        });
      }
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (/^--.+=/.test(arg)) {
          const m = arg.match(/^--([^=]+)=([\s\S]*)$/);
          var key = m[1];
          let value = m[2];
          if (flags.bools[key]) {
            value = value !== "false";
          }
          setArg(key, value, arg);
        } else if (/^--no-.+/.test(arg)) {
          var key = arg.match(/^--no-(.+)/)[1];
          setArg(key, false, arg);
        } else if (/^--.+/.test(arg)) {
          var key = arg.match(/^--(.+)/)[1];
          var next = args[i + 1];
          if (next !== void 0 && !/^-/.test(next) && !flags.bools[key] && !flags.allBools && (aliases[key] ? !aliasIsBoolean(key) : true)) {
            setArg(key, next, arg);
            i++;
          } else if (/^(true|false)$/.test(next)) {
            setArg(key, next === "true", arg);
            i++;
          } else {
            setArg(key, flags.strings[key] ? "" : true, arg);
          }
        } else if (/^-[^-]+/.test(arg)) {
          const letters = arg.slice(1, -1).split("");
          let broken = false;
          for (let j = 0; j < letters.length; j++) {
            var next = arg.slice(j + 2);
            if (next === "-") {
              setArg(letters[j], next, arg);
              continue;
            }
            if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
              setArg(letters[j], next.split("=")[1], arg);
              broken = true;
              break;
            }
            if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
              setArg(letters[j], next, arg);
              broken = true;
              break;
            }
            if (letters[j + 1] && letters[j + 1].match(/\W/)) {
              setArg(letters[j], arg.slice(j + 2), arg);
              broken = true;
              break;
            } else {
              setArg(letters[j], flags.strings[letters[j]] ? "" : true, arg);
            }
          }
          var key = arg.slice(-1)[0];
          if (!broken && key !== "-") {
            if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !flags.bools[key] && (aliases[key] ? !aliasIsBoolean(key) : true)) {
              setArg(key, args[i + 1], arg);
              i++;
            } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
              setArg(key, args[i + 1] === "true", arg);
              i++;
            } else {
              setArg(key, flags.strings[key] ? "" : true, arg);
            }
          }
        } else {
          if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
            argv._.push(
              flags.strings["_"] || !isNumber(arg) ? arg : Number(arg)
            );
          }
          if (opts.stopEarly) {
            argv._.push.apply(argv._, args.slice(i + 1));
            break;
          }
        }
      }
      Object.keys(defaults2).forEach(function(key2) {
        if (!hasKey(argv, key2.split("."))) {
          setKey(argv, key2.split("."), defaults2[key2]);
          (aliases[key2] || []).forEach(function(x) {
            setKey(argv, x.split("."), defaults2[key2]);
          });
        }
      });
      if (opts["--"]) {
        argv["--"] = [];
        notFlags.forEach(function(key2) {
          argv["--"].push(key2);
        });
      } else {
        notFlags.forEach(function(key2) {
          argv._.push(key2);
        });
      }
      return argv;
    };
    function hasKey(obj, keys) {
      let o = obj;
      keys.slice(0, -1).forEach(function(key2) {
        o = o[key2] || {};
      });
      const key = keys[keys.length - 1];
      return key in o;
    }
    function isNumber(x) {
      if (typeof x === "number")
        return true;
      if (/^0x[0-9a-f]+$/i.test(x))
        return true;
      return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
    }
    function isConstructorOrProto(obj, key) {
      return key === "constructor" && typeof obj[key] === "function" || key === "__proto__";
    }
  }
});

// ../../node_modules/.pnpm/rc@1.2.8/node_modules/rc/index.js
const require_rc = __commonJS({
  "../../node_modules/.pnpm/rc@1.2.8/node_modules/rc/index.js"(exports, module) {
    init_cjs_shim();
    const cc = require_utils();
    const join17 = __require("path").join;
    const deepExtend = require_deep_extend();
    const etc = "/etc";
    const win2 = process.platform === "win32";
    const home = win2 ? process.env.USERPROFILE : process.env.HOME;
    module.exports = function(name, defaults2, argv, parse) {
      if ("string" !== typeof name)
        throw new Error("rc(name): name *must* be string");
      if (!argv)
        argv = require_minimist()(process.argv.slice(2));
      defaults2 = ("string" === typeof defaults2 ? cc.json(defaults2) : defaults2) || {};
      parse = parse || cc.parse;
      const env = cc.env(name + "_");
      const configs = [defaults2];
      const configFiles = [];
      function addConfigFile(file) {
        if (configFiles.indexOf(file) >= 0)
          return;
        const fileConfig = cc.file(file);
        if (fileConfig) {
          configs.push(parse(fileConfig));
          configFiles.push(file);
        }
      }
      if (!win2)
        [
          join17(etc, name, "config"),
          join17(etc, name + "rc")
        ].forEach(addConfigFile);
      if (home)
        [
          join17(home, ".config", name, "config"),
          join17(home, ".config", name),
          join17(home, "." + name, "config"),
          join17(home, "." + name + "rc")
        ].forEach(addConfigFile);
      addConfigFile(cc.find("." + name + "rc"));
      if (env.config)
        addConfigFile(env.config);
      if (argv.config)
        addConfigFile(argv.config);
      return deepExtend.apply(null, configs.concat([
        env,
        argv,
        configFiles.length ? { configs: configFiles, config: configFiles[configFiles.length - 1] } : void 0
      ]));
    };
  }
});

// ../../node_modules/.pnpm/stackframe@1.3.4/node_modules/stackframe/stackframe.js
const require_stackframe = __commonJS({
  "../../node_modules/.pnpm/stackframe@1.3.4/node_modules/stackframe/stackframe.js"(exports, module) {
    init_cjs_shim();
    (function(root, factory) {
      "use strict";
      if (typeof define === "function" && define.amd) {
        define("stackframe", [], factory);
      } else if (typeof exports === "object") {
        module.exports = factory();
      } else {
        root.StackFrame = factory();
      }
    })(exports, function() {
      "use strict";
      function _isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      }
      function _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
      }
      function _getter(p) {
        return function() {
          return this[p];
        };
      }
      const booleanProps = ["isConstructor", "isEval", "isNative", "isToplevel"];
      const numericProps = ["columnNumber", "lineNumber"];
      const stringProps = ["fileName", "functionName", "source"];
      const arrayProps = ["args"];
      const objectProps = ["evalOrigin"];
      const props = booleanProps.concat(numericProps, stringProps, arrayProps, objectProps);
      function StackFrame2(obj) {
        if (!obj)
          return;
        for (let i2 = 0; i2 < props.length; i2++) {
          if (obj[props[i2]] !== void 0) {
            this["set" + _capitalize(props[i2])](obj[props[i2]]);
          }
        }
      }
      StackFrame2.prototype = {
        getArgs: function() {
          return this.args;
        },
        setArgs: function(v) {
          if (Object.prototype.toString.call(v) !== "[object Array]") {
            throw new TypeError("Args must be an Array");
          }
          this.args = v;
        },
        getEvalOrigin: function() {
          return this.evalOrigin;
        },
        setEvalOrigin: function(v) {
          if (v instanceof StackFrame2) {
            this.evalOrigin = v;
          } else if (v instanceof Object) {
            this.evalOrigin = new StackFrame2(v);
          } else {
            throw new TypeError("Eval Origin must be an Object or StackFrame");
          }
        },
        toString: function() {
          const fileName = this.getFileName() || "";
          const lineNumber = this.getLineNumber() || "";
          const columnNumber = this.getColumnNumber() || "";
          const functionName = this.getFunctionName() || "";
          if (this.getIsEval()) {
            if (fileName) {
              return "[eval] (" + fileName + ":" + lineNumber + ":" + columnNumber + ")";
            }
            return "[eval]:" + lineNumber + ":" + columnNumber;
          }
          if (functionName) {
            return functionName + " (" + fileName + ":" + lineNumber + ":" + columnNumber + ")";
          }
          return fileName + ":" + lineNumber + ":" + columnNumber;
        }
      };
      StackFrame2.fromString = function StackFrame$$fromString(str) {
        const argsStartIndex = str.indexOf("(");
        const argsEndIndex = str.lastIndexOf(")");
        const functionName = str.substring(0, argsStartIndex);
        const args = str.substring(argsStartIndex + 1, argsEndIndex).split(",");
        const locationString = str.substring(argsEndIndex + 1);
        if (locationString.indexOf("@") === 0) {
          const parts = /@(.+?)(?::(\d+))?(?::(\d+))?$/.exec(locationString, "");
          var fileName = parts[1];
          var lineNumber = parts[2];
          var columnNumber = parts[3];
        }
        return new StackFrame2({
          functionName,
          args: args || void 0,
          fileName,
          lineNumber: lineNumber || void 0,
          columnNumber: columnNumber || void 0
        });
      };
      for (let i = 0; i < booleanProps.length; i++) {
        StackFrame2.prototype["get" + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);
        StackFrame2.prototype["set" + _capitalize(booleanProps[i])] = /* @__PURE__ */ function(p) {
          return function(v) {
            this[p] = Boolean(v);
          };
        }(booleanProps[i]);
      }
      for (let j = 0; j < numericProps.length; j++) {
        StackFrame2.prototype["get" + _capitalize(numericProps[j])] = _getter(numericProps[j]);
        StackFrame2.prototype["set" + _capitalize(numericProps[j])] = /* @__PURE__ */ function(p) {
          return function(v) {
            if (!_isNumber(v)) {
              throw new TypeError(p + " must be a Number");
            }
            this[p] = Number(v);
          };
        }(numericProps[j]);
      }
      for (let k = 0; k < stringProps.length; k++) {
        StackFrame2.prototype["get" + _capitalize(stringProps[k])] = _getter(stringProps[k]);
        StackFrame2.prototype["set" + _capitalize(stringProps[k])] = /* @__PURE__ */ function(p) {
          return function(v) {
            this[p] = String(v);
          };
        }(stringProps[k]);
      }
      return StackFrame2;
    });
  }
});

// ../../node_modules/.pnpm/error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js
const require_error_stack_parser = __commonJS({
  "../../node_modules/.pnpm/error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js"(exports, module) {
    init_cjs_shim();
    (function(root, factory) {
      "use strict";
      if (typeof define === "function" && define.amd) {
        define("error-stack-parser", ["stackframe"], factory);
      } else if (typeof exports === "object") {
        module.exports = factory(require_stackframe());
      } else {
        root.ErrorStackParser = factory(root.StackFrame);
      }
    })(exports, function ErrorStackParser(StackFrame2) {
      "use strict";
      const FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
      const CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
      const SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code])?$/;
      return {
        /**
         * Given an Error object, extract the most information from it.
         *
         * @param {Error} error object
         * @return {Array} of StackFrames
         */
        parse: function ErrorStackParser$$parse(error) {
          if (typeof error.stacktrace !== "undefined" || typeof error["opera#sourceloc"] !== "undefined") {
            return this.parseOpera(error);
          } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
            return this.parseV8OrIE(error);
          } else if (error.stack) {
            return this.parseFFOrSafari(error);
          } else {
            throw new Error("Cannot parse given Error object");
          }
        },
        // Separate line and column numbers from a string of the form: (URI:Line:Column)
        extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
          if (urlLike.indexOf(":") === -1) {
            return [urlLike];
          }
          const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
          const parts = regExp.exec(urlLike.replace(/[()]/g, ""));
          return [parts[1], parts[2] || void 0, parts[3] || void 0];
        },
        parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
          const filtered = error.stack.split("\n").filter(function(line) {
            return !!line.match(CHROME_IE_STACK_REGEXP);
          }, this);
          return filtered.map(function(line) {
            if (line.indexOf("(eval ") > -1) {
              line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
            }
            let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
            const location = sanitizedLine.match(/ (\(.+\)$)/);
            sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
            const locationParts = this.extractLocation(location ? location[1] : sanitizedLine);
            const functionName = location && sanitizedLine || void 0;
            const fileName = ["eval", "<anonymous>"].indexOf(locationParts[0]) > -1 ? void 0 : locationParts[0];
            return new StackFrame2({
              functionName,
              fileName,
              lineNumber: locationParts[1],
              columnNumber: locationParts[2],
              source: line
            });
          }, this);
        },
        parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
          const filtered = error.stack.split("\n").filter(function(line) {
            return !line.match(SAFARI_NATIVE_CODE_REGEXP);
          }, this);
          return filtered.map(function(line) {
            if (line.indexOf(" > eval") > -1) {
              line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
            }
            if (line.indexOf("@") === -1 && line.indexOf(":") === -1) {
              return new StackFrame2({
                functionName: line
              });
            } else {
              const functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
              const matches = line.match(functionNameRegex);
              const functionName = matches && matches[1] ? matches[1] : void 0;
              const locationParts = this.extractLocation(line.replace(functionNameRegex, ""));
              return new StackFrame2({
                functionName,
                fileName: locationParts[0],
                lineNumber: locationParts[1],
                columnNumber: locationParts[2],
                source: line
              });
            }
          }, this);
        },
        parseOpera: function ErrorStackParser$$parseOpera(e) {
          if (!e.stacktrace || e.message.indexOf("\n") > -1 && e.message.split("\n").length > e.stacktrace.split("\n").length) {
            return this.parseOpera9(e);
          } else if (!e.stack) {
            return this.parseOpera10(e);
          } else {
            return this.parseOpera11(e);
          }
        },
        parseOpera9: function ErrorStackParser$$parseOpera9(e) {
          const lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
          const lines = e.message.split("\n");
          const result = [];
          for (let i = 2, len = lines.length; i < len; i += 2) {
            const match = lineRE.exec(lines[i]);
            if (match) {
              result.push(new StackFrame2({
                fileName: match[2],
                lineNumber: match[1],
                source: lines[i]
              }));
            }
          }
          return result;
        },
        parseOpera10: function ErrorStackParser$$parseOpera10(e) {
          const lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
          const lines = e.stacktrace.split("\n");
          const result = [];
          for (let i = 0, len = lines.length; i < len; i += 2) {
            const match = lineRE.exec(lines[i]);
            if (match) {
              result.push(
                new StackFrame2({
                  functionName: match[3] || void 0,
                  fileName: match[2],
                  lineNumber: match[1],
                  source: lines[i]
                })
              );
            }
          }
          return result;
        },
        // Opera 10.65+ Error.stack very similar to FF/Safari
        parseOpera11: function ErrorStackParser$$parseOpera11(error) {
          const filtered = error.stack.split("\n").filter(function(line) {
            return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
          }, this);
          return filtered.map(function(line) {
            const tokens = line.split("@");
            const locationParts = this.extractLocation(tokens.pop());
            const functionCall = tokens.shift() || "";
            const functionName = functionCall.replace(/<anonymous function(: (\w+))?>/, "$2").replace(/\([^)]*\)/g, "") || void 0;
            let argsRaw;
            if (functionCall.match(/\(([^)]*)\)/)) {
              argsRaw = functionCall.replace(/^[^(]+\(([^)]*)\)$/, "$1");
            }
            const args = argsRaw === void 0 || argsRaw === "[arguments not available]" ? void 0 : argsRaw.split(",");
            return new StackFrame2({
              functionName,
              args,
              fileName: locationParts[0],
              lineNumber: locationParts[1],
              columnNumber: locationParts[2],
              source: line
            });
          }, this);
        }
      };
    });
  }
});

// ../../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv/package.json
const require_package = __commonJS({
  "../../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv/package.json"(exports, module) {
    module.exports = {
      name: "dotenv",
      version: "16.4.5",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        "lint-readme": "standard-markdown",
        pretest: "npm run lint && npm run dts-check",
        test: "tap tests/*.js --100 -Rspec",
        "test:coverage": "tap --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@definitelytyped/dtslint": "^0.0.133",
        "@types/node": "^18.11.3",
        decache: "^4.6.1",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-markdown": "^7.1.0",
        "standard-version": "^9.5.0",
        tap: "^16.3.0",
        tar: "^6.1.11",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// ../../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv/lib/main.js
const require_main = __commonJS({
  "../../node_modules/.pnpm/dotenv@16.4.5/node_modules/dotenv/lib/main.js"(exports, module) {
    init_cjs_shim();
    const fs2 = __require("fs");
    const path4 = __require("path");
    const os = __require("os");
    const crypto = __require("crypto");
    const packageJson = require_package();
    const version = packageJson.version;
    const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      const vaultPath = _vaultPath(options);
      const result = DotenvModule.configDotenv({ path: vaultPath });
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _log(message) {
      console.log(`[dotenv@${version}][INFO] ${message}`);
    }
    function _warn(message) {
      console.log(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs2.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path4.resolve(process.cwd(), ".env.vault");
      }
      if (fs2.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path4.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      _log("Loading env from encrypted .env.vault");
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path4.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      const debug = Boolean(options && options.debug);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path5 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs2.readFileSync(path5, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path5} ${e.message}`);
          }
          lastError = e;
        }
      }
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsedAll, options);
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config2(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
        }
      }
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config: config2,
      decrypt,
      parse,
      populate
    };
    module.exports.configDotenv = DotenvModule.configDotenv;
    module.exports._configVault = DotenvModule._configVault;
    module.exports._parseVault = DotenvModule._parseVault;
    module.exports.config = DotenvModule.config;
    module.exports.decrypt = DotenvModule.decrypt;
    module.exports.parse = DotenvModule.parse;
    module.exports.populate = DotenvModule.populate;
    module.exports = DotenvModule;
  }
});

// ../../node_modules/.pnpm/application-config-path@0.1.0/node_modules/application-config-path/index.js
const require_application_config_path = __commonJS({
  "../../node_modules/.pnpm/application-config-path@0.1.0/node_modules/application-config-path/index.js"(exports, module) {
    init_cjs_shim();
    const os = __require("os");
    const path4 = __require("path");
    function darwin(name) {
      return path4.join(process.env["HOME"], "Library", "Application Support", name);
    }
    function linux(name) {
      if (process.env["XDG_CONFIG_HOME"]) {
        return path4.join(process.env["XDG_CONFIG_HOME"], name);
      }
      return path4.join(process.env["HOME"], ".config", name);
    }
    function win32(name) {
      if (process.env["LOCALAPPDATA"]) {
        return path4.join(process.env["LOCALAPPDATA"], name);
      }
      return path4.join(process.env["USERPROFILE"], "Local Settings", "Application Data", name);
    }
    function applicationConfigPath(name) {
      if (typeof name !== "string") {
        throw new TypeError("`name` must be string");
      }
      switch (os.platform()) {
        case "darwin":
          return darwin(name);
        case "linux":
          return linux(name);
        case "win32":
          return win32(name);
      }
      throw new Error("Platform not supported");
    }
    module.exports = applicationConfigPath;
  }
});

// ../../node_modules/.pnpm/mkdirp@0.5.6/node_modules/mkdirp/index.js
const require_mkdirp = __commonJS({
  "../../node_modules/.pnpm/mkdirp@0.5.6/node_modules/mkdirp/index.js"(exports, module) {
    init_cjs_shim();
    const path4 = __require("path");
    const fs2 = __require("fs");
    const _0777 = parseInt("0777", 8);
    module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;
    function mkdirP(p, opts, f, made) {
      if (typeof opts === "function") {
        f = opts;
        opts = {};
      } else if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      let mode = opts.mode;
      const xfs = opts.fs || fs2;
      if (mode === void 0) {
        mode = _0777;
      }
      if (!made)
        made = null;
      const cb = f || /* istanbul ignore next */
      function() {
      };
      p = path4.resolve(p);
      xfs.mkdir(p, mode, function(er) {
        if (!er) {
          made = made || p;
          return cb(null, made);
        }
        switch (er.code) {
          case "ENOENT":
            if (path4.dirname(p) === p)
              return cb(er);
            mkdirP(path4.dirname(p), opts, function(er2, made2) {
              if (er2)
                cb(er2, made2);
              else
                mkdirP(p, opts, cb, made2);
            });
            break;
          default:
            xfs.stat(p, function(er2, stat4) {
              if (er2 || !stat4.isDirectory())
                cb(er, made);
              else
                cb(null, made);
            });
            break;
        }
      });
    }
    mkdirP.sync = function sync(p, opts, made) {
      if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      let mode = opts.mode;
      const xfs = opts.fs || fs2;
      if (mode === void 0) {
        mode = _0777;
      }
      if (!made)
        made = null;
      p = path4.resolve(p);
      try {
        xfs.mkdirSync(p, mode);
        made = made || p;
      } catch (err0) {
        switch (err0.code) {
          case "ENOENT":
            made = sync(path4.dirname(p), opts, made);
            sync(p, opts, made);
            break;
          default:
            var stat4;
            try {
              stat4 = xfs.statSync(p);
            } catch (err1) {
              throw err0;
            }
            if (!stat4.isDirectory())
              throw err0;
            break;
        }
      }
      return made;
    };
  }
});

// ../../node_modules/.pnpm/application-config@1.0.1/node_modules/application-config/index.js
const require_application_config = __commonJS({
  "../../node_modules/.pnpm/application-config@1.0.1/node_modules/application-config/index.js"(exports, module) {
    init_cjs_shim();
    const fs2 = __require("fs");
    const path4 = __require("path");
    const applicationConfigPath = require_application_config_path();
    function ApplicationConfig(name) {
      this.filePath = path4.join(applicationConfigPath(name), "config.json");
    }
    ApplicationConfig.prototype.read = function(cb) {
      const self = this;
      fs2.readFile(self.filePath, function(err, raw) {
        if (err && err.code === "ENOENT")
          return cb(null, {});
        if (err)
          return cb(err);
        let data;
        try {
          data = JSON.parse(raw.toString());
        } catch (err2) {
          return cb(err2);
        }
        cb(null, data);
      });
    };
    ApplicationConfig.prototype.write = function(data, cb) {
      const self = this;
      const mkdirp = require_mkdirp();
      if (typeof data !== "object" || data === null) {
        throw new TypeError("data is not an object");
      }
      const directoryPath = path4.dirname(self.filePath);
      mkdirp(directoryPath, function(err) {
        if (err) {
          return cb(err);
        }
        const tempFilePath = self.filePath + "-" + Math.random().toString().substr(2) + Date.now().toString() + path4.extname(self.filePath);
        fs2.writeFile(tempFilePath, JSON.stringify(data, null, 2), function(err2) {
          if (err2) {
            return cb(err2);
          }
          fs2.rename(tempFilePath, self.filePath, cb);
        });
      });
    };
    ApplicationConfig.prototype.trash = function(cb) {
      const self = this;
      fs2.unlink(self.filePath, function(err) {
        if (err && err.code !== "ENOENT")
          return cb(err);
        const directoryPath = path4.dirname(self.filePath);
        fs2.rmdir(directoryPath, function(err2) {
          if (err2 && err2.code !== "ENOENT")
            return cb(err2);
          cb(null);
        });
      });
    };
    module.exports = function createApplicationConfig(name) {
      return new ApplicationConfig(name);
    };
  }
});

// ../../node_modules/.pnpm/debounce@1.2.1/node_modules/debounce/index.js
const require_debounce = __commonJS({
  "../../node_modules/.pnpm/debounce@1.2.1/node_modules/debounce/index.js"(exports, module) {
    init_cjs_shim();
    function debounce3(func, wait, immediate) {
      let timeout, args, context, timestamp, result;
      if (null == wait)
        wait = 100;
      function later() {
        const last = Date.now() - timestamp;
        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            context = args = null;
          }
        }
      }
      ;
      const debounced = function() {
        context = this;
        args = arguments;
        timestamp = Date.now();
        const callNow = immediate && !timeout;
        if (!timeout)
          timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }
        return result;
      };
      debounced.clear = function() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };
      debounced.flush = function() {
        if (timeout) {
          result = func.apply(context, args);
          context = args = null;
          clearTimeout(timeout);
          timeout = null;
        }
      };
      return debounced;
    }
    ;
    debounce3.debounce = debounce3;
    module.exports = debounce3;
  }
});

// src/index.ts
init_cjs_shim();

// src/rc.ts
init_cjs_shim();
const import_rc = __toESM(require_rc(), 1);
const defaults = {
  "log-debug": false,
  "log-to-console": false,
  "machine-readable-stacktrace": false,
  theme: void 0,
  devmode: false,
  "translation-watch": false,
  "theme-watch": false,
  minimized: false,
  version: false,
  v: false,
  help: false,
  h: false,
  "allow-unsafe-core-replacement": false
};
const config = (0, import_rc.default)("DeltaChat", defaults);
if (config.version || config.v) {
  config.version == true;
}
if (config.help || config.h) {
  config.help == true;
}
if (config.devmode) {
  config["log-debug"] = true;
  config["log-to-console"] = true;
}
const rc_config = Object.freeze(config);
const rc_default = rc_config;

// src/electron-context-menu.ts
init_cjs_shim();

// src/load-translations.ts
init_cjs_shim();

// ../shared/logger.ts
init_cjs_shim();
const import_error_stack_parser = __toESM(require_error_stack_parser(), 1);
const startTime = Date.now();
const colorize = (light, code) => (str) => "\x1B[" + light + ";" + code + "m" + str + "\x1B[0m";
const blue = colorize(1, 34);
const red = colorize(1, 31);
const yellow = colorize(1, 33);
const grey = colorize(0, 37);
const green = colorize(1, 37);
const cyan = colorize(1, 36);
const emojiFontCss = 'font-family: Roboto, "Apple Color Emoji", NotoEmoji, "Helvetica Neue", Arial, Helvetica, NotoMono, sans-serif !important;';
var LogLevelString = /* @__PURE__ */ ((LogLevelString2) => {
  LogLevelString2["DEBUG"] = "DEBUG";
  LogLevelString2["WARNING"] = "WARNING";
  LogLevelString2["INFO"] = "INFO";
  LogLevelString2["ERROR"] = "ERROR";
  LogLevelString2["CRITICAL"] = "CRITICAL";
  return LogLevelString2;
})(LogLevelString || {});
const LoggerVariants = [
  {
    log: console.debug,
    level: "DEBUG" /* DEBUG */,
    emoji: "\u{1F578}\uFE0F",
    symbol: "[D]"
  },
  {
    log: console.info,
    level: "INFO" /* INFO */,
    emoji: "\u2139\uFE0F",
    symbol: blue("[i]")
  },
  {
    log: console.warn,
    level: "WARNING" /* WARNING */,
    emoji: "\u26A0\uFE0F",
    symbol: yellow("[w]")
  },
  {
    log: console.error,
    level: "ERROR" /* ERROR */,
    emoji: "\u{1F6A8}",
    symbol: red("[E]")
  },
  {
    log: console.error,
    level: "CRITICAL" /* CRITICAL */,
    emoji: "\u{1F6A8}\u{1F6A8}",
    symbol: red("[C]")
  }
];
function printProcessLogLevelInfo() {
  console.info(
    `%cLogging Levels:
${LoggerVariants.map((v) => `${v.emoji} ${v.level}`).join(
      "\n"
    )}`,
    emojiFontCss
  );
  console.info(
    `# Tips and Tricks for using the search filter in the browser console:

\u2022 Use space to separate search terms
\u2022 Exclude search terms using -
\u2022 If the search term contains spaces you should escape it with ""

Examples:

\u{1F578}\uFE0F          only show debug messages
-\u{1F578}\uFE0F         don't show debug messages
\u2139\uFE0F          only show info messages
-\u2139\uFE0F         don't show info messages
\u{1F47B}          only show events from background accounts (not selected accounts)
-\u{1F47B}         don't show events from background accounts (not selected accounts)
\u{1F4E1}          only show events
-\u{1F4E1}         don't show any events
[JSONRPC]   only show jsonrpc messages
-[JSONRPC]  don't show jsonrpc messages

Start deltachat with --devmode (or --log-debug and --log-to-console) argument to show full log output.
If the log seems quiet, make sure the 'All levels' drop down has 'Verbose' checked.
  `
  );
}
let handler;
let rc2 = {};
function setLogHandler(LogHandler3, rcObject) {
  handler = LogHandler3;
  rc2 = rcObject;
}
function log({ channel, isMainProcess }, level, stacktrace, args) {
  const variant = LoggerVariants[level];
  if (!handler) {
    console.log("Failed to log message - Handler not initialized yet");
    console.log(`Log Message: ${channel} ${level} ${args.join(" ")}`);
    throw Error("Failed to log message - Handler not initialized yet");
  }
  handler(channel, variant.level, stacktrace, ...args);
  if (rc2["log-to-console"]) {
    if (isMainProcess) {
      const beginning = `${Math.round((Date.now() - startTime) / 100) / 10}s ${LoggerVariants[level].symbol}${grey(channel)}:`;
      if (!stacktrace) {
        variant.log(beginning, ...args);
      } else {
        variant.log(
          beginning,
          ...args,
          red(
            Array.isArray(stacktrace) ? stacktrace.map((s) => `
${s.toString()}`).join() : stacktrace
          )
        );
      }
    } else {
      const prefix = `%c${variant.emoji}%c${channel}`;
      const prefixStyle = [emojiFontCss, "color:blueviolet;"];
      if (stacktrace) {
        variant.log(prefix, ...prefixStyle, stacktrace, ...args);
      } else {
        variant.log(prefix, ...prefixStyle, ...args);
      }
    }
  }
}
function getStackTrace() {
  const rawStack = import_error_stack_parser.default.parse(
    new Error("Get Stacktrace")
  );
  const stack = rawStack.slice(2, rawStack.length);
  return rc2["machine-readable-stacktrace"] ? stack : stack.map((s) => `
${s.toString()}`).join();
}
const Logger = class {
  constructor(channel) {
    this.channel = channel;
    //@ts-ignore
    this.isMainProcess = typeof window === "undefined";
    if (channel === "core/event") {
      this.getStackTrace = () => "";
    }
  }
  getStackTrace() {
    const rawStack = import_error_stack_parser.default.parse(
      new Error("Get Stacktrace")
    );
    const stack = rawStack.slice(2, rawStack.length);
    return rc2["machine-readable-stacktrace"] ? stack : stack.map((s) => `
${s.toString()}`).join();
  }
  debug(...args) {
    if (!rc2["log-debug"])
      return;
    log(this, 0, "", args);
  }
  info(...args) {
    log(this, 1, "", args);
  }
  warn(...args) {
    log(this, 2, this.getStackTrace(), args);
  }
  error(...args) {
    log(this, 3, this.getStackTrace(), args);
  }
  /** use this when you know that the stacktrace is not relevant */
  errorWithoutStackTrace(...args) {
    log(this, 3, [], args);
  }
  critical(...args) {
    log(this, 4, this.getStackTrace(), args);
  }
};
function getLogger(channel) {
  return new Logger(channel);
}
if (!("toJSON" in Error.prototype))
  Object.defineProperty(Error.prototype, "toJSON", {
    value: function() {
      const alt = {};
      Object.getOwnPropertyNames(this).forEach(function(key) {
        alt[key] = this[key];
      }, this);
      return alt;
    },
    configurable: true,
    writable: true
  });

// ../shared/localize.ts
init_cjs_shim();
const log2 = getLogger("localize");
function translate(locale, messages) {
  const localeBCP47 = locale.replace("_", "-");
  let pluralRules;
  try {
    pluralRules = new Intl.PluralRules(localeBCP47);
  } catch (err) {
    log2.errorWithoutStackTrace(err);
    pluralRules = new Intl.PluralRules("en");
  }
  function getMessage(key, substitutions, raw_opts) {
    const translationKey = key;
    let opts = {};
    if (typeof raw_opts === "string")
      opts = { quantity: raw_opts };
    else
      opts = Object.assign({}, raw_opts);
    const entry = messages[translationKey];
    if (!entry) {
      log2.error(`Missing translation for key '${translationKey}'`);
      return translationKey;
    }
    let message = entry.message;
    if (typeof opts.quantity !== "undefined") {
      if (typeof opts.quantity === "string") {
        message = entry[opts.quantity];
      } else if (typeof opts.quantity === "number") {
        message = entry[opts.quantity] || // TODO fix: simply using `pluralRules.select()` to index
        // into the object is not quite right,
        // because the string could be untranslated, and it'd fall back to
        // English, with only 'one' and 'other' plural categories,
        // in which case we must apply the English
        // plural rules instead of the current locale's rules.
        //
        // Currently this is behaves incorrectly e.g. for untranslated
        // Indonesian (id), which only has the 'other' plural category,
        // so even when we have to use 'one' for English, we'd use 'other'.
        //
        // But currently we don't have a way to distinguish between translated
        // and untranslated strings in this code.
        // See https://github.com/deltachat/deltachat-desktop/blob/b342a1d47b505e68caaec71f79c381c3f304405a/src/main/load-translations.ts#L44-L64
        entry[pluralRules.select(opts.quantity)] || // This also catches the case where we failed to construct
        // `Intl.PluralRules` for the currentl locale, and fall back to
        // English (see `try catch` above).
        entry["other"];
      } else {
        message = void 0;
      }
      if (typeof message === "undefined") {
        log2.error(
          `Missing quantity '${opts.quantity}' for key '${translationKey}'`
        );
        return `${translationKey}:${opts.quantity}`;
      }
    }
    if (typeof message === "undefined") {
      log2.error(
        `Missing 'message' for key '${translationKey}', maybe you need to specify quantity`
      );
      return `${translationKey}:?`;
    }
    if (substitutions) {
      if (!Array.isArray(substitutions)) {
        substitutions = [substitutions];
      }
      let counter = -1;
      return message.replace(/(?:%\d\$[\w\d])|(?:%[\w\d])/g, (f) => {
        counter++;
        if (f.length > 2) {
          const index = Number.parseInt(f[1]) - 1;
          if (substitutions === void 0 || typeof substitutions[index] === "undefined") {
            log2.error(`Missing ${index} argument for key %c'${translationKey}'`);
            return "";
          }
          return substitutions[index].toString();
        }
        if (substitutions === void 0 || typeof substitutions?.[counter] === "undefined") {
          log2.error(`Missing ${0} argument for key %c'${translationKey}'`);
          return "";
        }
        return substitutions[counter].toString();
      });
    }
    return message;
  }
  return getMessage;
}

// src/menu.ts
init_cjs_shim();

// ../shared/constants.ts
init_cjs_shim();
const appName = "Delta Chat";
const homePageUrl = "https://delta.chat";
const gitHubUrl = "https://github.com/deltachat/deltachat-desktop";
const gitHubIssuesUrl = gitHubUrl + "/issues";
const gitHubLicenseUrl = gitHubUrl + "/blob/main/LICENSE";
const donationUrl = "https://delta.chat/donate";
const appWindowTitle = appName;
var Timespans = /* @__PURE__ */ ((Timespans2) => {
  Timespans2[Timespans2["ZERO_SECONDS"] = 0] = "ZERO_SECONDS";
  Timespans2[Timespans2["ONE_SECOND"] = 1] = "ONE_SECOND";
  Timespans2[Timespans2["ONE_MINUTE_IN_SECONDS"] = 60] = "ONE_MINUTE_IN_SECONDS";
  Timespans2[Timespans2["ONE_HOUR_IN_SECONDS"] = 3600] = "ONE_HOUR_IN_SECONDS";
  Timespans2[Timespans2["ONE_DAY_IN_SECONDS"] = 86400] = "ONE_DAY_IN_SECONDS";
  Timespans2[Timespans2["ONE_WEEK_IN_SECONDS"] = 604800] = "ONE_WEEK_IN_SECONDS";
  Timespans2[Timespans2["ONE_YEAR_IN_SECONDS"] = 31536e3] = "ONE_YEAR_IN_SECONDS";
  return Timespans2;
})(Timespans || {});
var AutodeleteDuration = /* @__PURE__ */ ((AutodeleteDuration2) => {
  AutodeleteDuration2[AutodeleteDuration2["NEVER"] = 0 /* ZERO_SECONDS */] = "NEVER";
  AutodeleteDuration2[AutodeleteDuration2["AT_ONCE"] = 1 /* ONE_SECOND */] = "AT_ONCE";
  AutodeleteDuration2[AutodeleteDuration2["ONE_MINUTE"] = 60 /* ONE_MINUTE_IN_SECONDS */] = "ONE_MINUTE";
  AutodeleteDuration2[AutodeleteDuration2["ONE_HOUR"] = 3600 /* ONE_HOUR_IN_SECONDS */] = "ONE_HOUR";
  AutodeleteDuration2[AutodeleteDuration2["ONE_DAY"] = 86400 /* ONE_DAY_IN_SECONDS */] = "ONE_DAY";
  AutodeleteDuration2[AutodeleteDuration2["ONE_WEEK"] = 604800 /* ONE_WEEK_IN_SECONDS */] = "ONE_WEEK";
  AutodeleteDuration2[AutodeleteDuration2["FIVE_WEEKS"] = 3024e3] = "FIVE_WEEKS";
  AutodeleteDuration2[AutodeleteDuration2["ONE_YEAR"] = 31536e3 /* ONE_YEAR_IN_SECONDS */] = "ONE_YEAR";
  return AutodeleteDuration2;
})(AutodeleteDuration || {});
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "apng", "gif", "webp"];
const VIDEO_CHAT_INSTANCE_SYSTEMLI = "https://meet.systemli.org/$ROOM";
const VIDEO_CHAT_INSTANCE_AUTISTICI = "https://vc.autistici.org/$ROOM";
var NOTIFICATION_TYPE = /* @__PURE__ */ ((NOTIFICATION_TYPE2) => {
  NOTIFICATION_TYPE2[NOTIFICATION_TYPE2["MESSAGE"] = 0] = "MESSAGE";
  NOTIFICATION_TYPE2[NOTIFICATION_TYPE2["REACTION"] = 1] = "REACTION";
  NOTIFICATION_TYPE2[NOTIFICATION_TYPE2["WEBXDC_INFO"] = 2] = "WEBXDC_INFO";
  return NOTIFICATION_TYPE2;
})(NOTIFICATION_TYPE || {});

// src/application-constants.ts
init_cjs_shim();

// src/application-config.ts
init_cjs_shim();
const import_application_config = __toESM(require_application_config(), 1);
if (process.env.NODE_ENV !== "production") {
  try {
    const { config: config2 } = await Promise.resolve().then(() => __toESM(require_main(), 1));
    config2();
  } catch (e) {
    console.error("Failed to load .env file", e);
  }
}
const appConfig = (0, import_application_config.default)("DeltaChat");
import { join } from "path";
if (process.env.DC_TEST_DIR) {
  appConfig.filePath = join(process.env.DC_TEST_DIR, "config.json");
} else if (process.env.PORTABLE_EXECUTABLE_DIR) {
  console.log("Running in Portable Mode", process.env.PORTABLE_EXECUTABLE_DIR);
  appConfig.filePath = join(
    process.env.PORTABLE_EXECUTABLE_DIR,
    "DeltaChatData",
    "config.json"
  );
}
const application_config_default = Object.freeze(appConfig);

// src/application-constants.ts
import { dirname, join as join2 } from "path";
import { app, screen } from "electron";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const AppFilesDir = join2(__dirname, "..");
function appIcon() {
  const iconFormat = process.platform === "win32" ? ".ico" : ".png";
  return `${join2(htmlDistDir(), "images", "deltachat" + iconFormat)}`;
}
function htmlDistDir() {
  return join2(AppFilesDir, "html-dist");
}
function windowDefaults() {
  let targetFile = "main.html";
  let defaultWidth = 1e3;
  if (process.env.NODE_ENV === "test") {
    targetFile = "test.html";
    defaultWidth = 1100;
  }
  const { height: screenHeight, width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const headerHeight = 38;
  const defaultHeight = Math.min(802 + headerHeight, screenHeight);
  const x = (screenWidth - defaultWidth) / 2;
  const y = (screenHeight - defaultHeight) / 2;
  return {
    bounds: {
      height: defaultHeight,
      width: defaultWidth,
      x,
      y
    },
    headerHeight,
    // On 0.6x zoom Delta Chat and 200x window size it's still somewhat usable,
    // not much is overflowing.
    minWidth: 225,
    minHeight: 125,
    main: targetFile,
    preload: join2(htmlDistDir(), "preload.js")
  };
}
function getConfigPath() {
  return dirname(application_config_default.filePath);
}
function getLogsPath() {
  return join2(getConfigPath(), "logs");
}
function getAccountsPath() {
  return join2(getConfigPath(), "accounts");
}
function getCustomThemesPath() {
  return join2(getConfigPath(), "custom-themes");
}
function getDraftTempDir() {
  return join2(app.getPath("temp"), "chat.delta.desktop-draft");
}
const supportedURISchemes = [
  "OPENPGP4FPR:",
  "MAILTO:",
  "DCACCOUNT:",
  "DCLOGIN:"
];
const ALLOWED_RESOURCE_FOLDERS = ["images", "node_modules", "html-dist"];
const ALLOWED_SOURCE_FOLDERS = ["src", "scss", "node_modules"];
const ALLOWED_CONFIG_FOLDERS = ["background"];
const ALLOWED_STATIC_FOLDERS = [
  ...[...ALLOWED_RESOURCE_FOLDERS, ...ALLOWED_SOURCE_FOLDERS].map(
    (folder) => join2(AppFilesDir, folder)
  ),
  ...ALLOWED_CONFIG_FOLDERS.map((folder) => join2(getConfigPath(), folder)),
  getDraftTempDir()
];
const ALLOWED_ACCOUNT_FOLDERS = [
  "db.sqlite-blobs",
  "dc.db-blobs",
  "stickers"
];
const INTERNAL_TMP_DIR_NAME = "tmp";

// src/windows/main.ts
const main_exports = {};
__export(main_exports, {
  chooseLanguage: () => chooseLanguage,
  hide: () => hide,
  init: () => init,
  isAlwaysOnTop: () => isAlwaysOnTop,
  send: () => send,
  setBounds: () => setBounds,
  setProgress: () => setProgress,
  setTitle: () => setTitle,
  setZoomFactor: () => setZoomFactor,
  show: () => show,
  toggleAlwaysOnTop: () => toggleAlwaysOnTop,
  toggleDevTools: () => toggleDevTools,
  window: () => window2
});
init_cjs_shim();

// src/tray.ts
init_cjs_shim();

// src/desktop_settings.ts
init_cjs_shim();

// ../shared/state.ts
init_cjs_shim();
function getDefaultState() {
  return {
    bounds: {},
    HTMLEmailWindowBounds: void 0,
    enterKeySends: false,
    notifications: true,
    showNotificationContent: true,
    locale: null,
    // if this is null, the system chooses the system language that electron reports
    credentials: void 0,
    lastAccount: void 0,
    enableAVCalls: false,
    enableBroadcastLists: false,
    enableChatAuditLog: false,
    enableOnDemandLocationStreaming: false,
    chatViewBgImg: void 0,
    lastChats: {},
    zoomFactor: 1,
    activeTheme: "system",
    minimizeToTray: true,
    syncAllAccounts: true,
    lastSaveDialogLocation: void 0,
    experimentalEnableMarkdownInMessages: false,
    enableWebxdcDevTools: false,
    HTMLEmailAskForRemoteLoadingConfirmation: true,
    HTMLEmailAlwaysLoadRemoteContent: false,
    enableRelatedChats: false,
    galleryImageKeepAspectRatio: false,
    useSystemUIFont: false,
    contentProtectionEnabled: false,
    isMentionsEnabled: true,
    autostart: true
  };
}

// src/desktop_settings.ts
const import_debounce = __toESM(require_debounce(), 1);
import { EventEmitter } from "events";
import { promisify } from "util";
const log3 = getLogger("main/state");
const SAVE_DEBOUNCE_INTERVAL = 1e3;
const PersistentState = class extends EventEmitter {
  constructor() {
    super();
  }
  inner_state = null;
  get state() {
    if (this.inner_state == null) {
      throw new Error("Can not access persistent state before initialisation");
    }
    return this.inner_state;
  }
  async load() {
    const default_state = getDefaultState();
    let saved = {};
    try {
      saved = await promisify(
        (cb) => application_config_default.read(cb)
      )();
      if (typeof saved.lastAccount !== "number" || saved.lastAccount < 0) {
        saved.lastAccount = void 0;
      }
    } catch (error) {
      log3.debug(error);
      log3.info("Missing configuration file. Using default values.");
    }
    this.inner_state = Object.assign(default_state, saved);
  }
  update(state) {
    this.inner_state = { ...this.inner_state, ...state };
    this.save();
  }
  /** state.save() calls are rate-limited. Use `PersistentState.saveImmediate()` to skip limit. */
  save() {
    this.save = (0, import_debounce.default)(this.saveImmediate, SAVE_DEBOUNCE_INTERVAL);
    this.saveImmediate();
  }
  saveImmediate() {
    log3.info(`Saving state to ${application_config_default.filePath}`);
    const copy = Object.assign({}, this.inner_state);
    return new Promise((res, rej) => {
      application_config_default.write(copy, (err) => {
        if (err) {
          log3.error("State save failed", err);
          rej(err);
        }
        res(err);
      });
    });
  }
};
const DesktopSettings = new PersistentState();

// src/tray.ts
import { app as rawApp, Menu, Tray, nativeImage } from "electron";
import { globalShortcut } from "electron";
import { join as join3, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
const __dirname2 = dirname2(fileURLToPath2(import.meta.url));
let tray = null;
let contextMenu = null;
const app2 = rawApp;
const log4 = getLogger("main/tray");
let has_unread = false;
function set_has_unread(new_has_unread) {
  has_unread = new_has_unread;
  if (tray) {
    tray.setImage(TrayImage());
  }
}
function TrayImage() {
  const trayIconFolder = join3(htmlDistDir(), "images/tray");
  if (process.platform === "darwin") {
    const image = nativeImage.createFromPath(join3(trayIconFolder, "tray-icon-mac.png")).resize({ width: 24 });
    image.setTemplateImage(true);
    return image;
  } else {
    const iconFormat = process.platform === "win32" ? ".ico" : ".png";
    return `${join3(
      trayIconFolder,
      (has_unread ? "deltachat-unread" : "deltachat") + iconFormat
    )}`;
  }
}
function mainWindowIsVisible() {
  if (!window2) {
    throw new Error("window does not exist, this should never happen");
  }
  if (process.platform === "darwin" || process.platform === "win32") {
    return window2.isVisible();
  }
  return window2.isVisible() && window2.isFocused();
}
function hideDeltaChat(minimize) {
  if (!window2) {
    throw new Error("window does not exist, this should never happen");
  }
  if (minimize === true) {
    window2.minimize();
  }
  window2.hide();
  if (process.platform === "linux")
    tray?.setContextMenu(getTrayMenu());
}
function showDeltaChat() {
  if (!window2) {
    throw new Error("window does not exist, this should never happen");
  }
  window2.show();
}
function hideOrShowDeltaChat() {
  mainWindowIsVisible() ? hideDeltaChat(true) : showDeltaChat();
}
function quitDeltaChat() {
  globalShortcut.unregisterAll();
  app2.quit();
}
function updateTrayIcon() {
  if (!app2.rc["minimized"] && DesktopSettings.state.minimizeToTray !== true) {
    if (tray != null)
      destroyTrayIcon();
    return;
  }
  renderTrayIcon();
}
function destroyTrayIcon() {
  log4.info("destroy icon tray");
  tray?.destroy();
  tray = null;
}
function getTrayMenu() {
  if (tray === null)
    return;
  if (process.platform === "darwin") {
    contextMenu = Menu.buildFromTemplate([
      mainWindowIsVisible() ? {
        id: "reduce_window",
        label: tx("hide"),
        type: "normal",
        click() {
          hideDeltaChat();
          refreshTrayContextMenu();
        }
      } : {
        id: "open_windows",
        label: tx("activate"),
        type: "normal",
        click() {
          showDeltaChat();
          refreshTrayContextMenu();
        }
      },
      {
        id: "quit_app",
        label: tx("global_menu_file_quit_desktop"),
        type: "normal",
        click() {
          quitDeltaChat();
        }
      }
    ]);
  } else {
    contextMenu = Menu.buildFromTemplate([
      {
        id: "open_windows",
        label: tx("global_menu_file_open_desktop"),
        type: "normal",
        click() {
          showDeltaChat();
        }
      },
      {
        id: "reduce_window",
        label: tx("global_menu_minimize_to_tray"),
        type: "normal",
        enabled: mainWindowIsVisible(),
        click() {
          hideDeltaChat();
        }
      },
      {
        id: "quit_app",
        label: tx("global_menu_file_quit_desktop"),
        type: "normal",
        click() {
          quitDeltaChat();
        }
      }
    ]);
  }
  return contextMenu;
}
function TrayIcon() {
  return new Tray(TrayImage());
}
function renderTrayIcon() {
  if (tray != null) {
    log4.warn("Tray icon not destroyed before render?");
    destroyTrayIcon();
  }
  log4.info("add icon tray");
  tray = TrayIcon();
  tray.setToolTip("Delta Chat");
  if (process.platform === "darwin") {
    tray.on("click", () => tray?.popUpContextMenu(getTrayMenu()));
    tray.on("right-click", () => tray?.popUpContextMenu(getTrayMenu()));
  } else if (process.platform === "win32") {
    tray.on("click", hideOrShowDeltaChat);
    tray.on("right-click", () => tray?.popUpContextMenu(getTrayMenu()));
  } else {
    tray.on("click", hideOrShowDeltaChat);
    tray.on("double-click", hideOrShowDeltaChat);
    refreshTrayContextMenu();
  }
}
function refreshTrayContextMenu() {
  tray?.setContextMenu(getTrayMenu());
}

// src/windows/helpers.ts
init_cjs_shim();
import { screen as screen2 } from "electron";
function initMinWinDimensionHandling(main_window, minWidth, minHeight) {
  const update_min_size = () => {
    const { workAreaSize } = screen2.getPrimaryDisplay();
    if (
      // A multiplier to make space for the taskbar and the window header.
      // Remember that the taskbar could also be placed vertically.
      workAreaSize.width * 0.75 < minWidth || workAreaSize.height * 0.75 < minHeight
    ) {
      main_window.setMinimumSize(0, 0);
    } else {
      main_window.setMinimumSize(minWidth, minHeight);
    }
  };
  screen2.addListener("display-added", update_min_size);
  screen2.addListener("display-metrics-changed", update_min_size);
  screen2.addListener("display-removed", update_min_size);
  update_min_size();
  return () => {
    screen2.removeListener("display-added", update_min_size);
    screen2.removeListener("display-metrics-changed", update_min_size);
    screen2.removeListener("display-removed", update_min_size);
  };
}

// src/content-protection.ts
init_cjs_shim();
import { BrowserWindow as BrowserWindow2 } from "electron";
import { platform } from "os";
const log5 = getLogger("contentProtection");
function updateContentProtection(window3, enabled) {
  window3.setContentProtection(enabled);
  if (enabled && platform() !== "darwin" && platform() !== "win32") {
    log5.warn("setContentProtection not available on your platform", platform());
  }
}
function setContentProtection(window3) {
  updateContentProtection(
    window3,
    DesktopSettings.state.contentProtectionEnabled
  );
}
function updateContentProtectionOnAllActiveWindows(enabled) {
  for (const win2 of BrowserWindow2.getAllWindows()) {
    updateContentProtection(win2, enabled);
  }
}

// src/windows/main.ts
const import_debounce2 = __toESM(require_debounce(), 1);
import electron, { session } from "electron";
import { isAbsolute, join as join4, sep } from "path";
import { platform as platform2 } from "os";
import { fileURLToPath as fileURLToPath3 } from "url";
const log6 = getLogger("/mainWindow");
var window2 = null;
function init(options) {
  if (window2) {
    return window2.show();
  }
  const defaults2 = windowDefaults();
  const initialBounds = Object.assign(
    defaults2.bounds,
    DesktopSettings.state.bounds
  );
  const isMac2 = platform2() === "darwin";
  const mainWindow = window2 = new electron.BrowserWindow({
    backgroundColor: "#282828",
    // backgroundThrottling: false, // do not throttle animations/timers when page is background
    darkTheme: true,
    // Forces dark theme (GTK+3)
    icon: appIcon(),
    show: false,
    title: appWindowTitle,
    height: initialBounds.height,
    width: initialBounds.width,
    x: initialBounds.x,
    y: initialBounds.y,
    webPreferences: {
      nodeIntegration: false,
      preload: defaults2.preload,
      spellcheck: false,
      // until we can load a local dictionary, see https://github.com/electron/electron/issues/22995
      webSecurity: true,
      allowRunningInsecureContent: false,
      contextIsolation: false
    },
    titleBarStyle: isMac2 ? "hidden" : "default",
    titleBarOverlay: true
  });
  mainWindow.filePathWhiteList = [];
  initMinWinDimensionHandling(mainWindow, defaults2.minWidth, defaults2.minHeight);
  setContentProtection(window2);
  session.defaultSession.setSpellCheckerDictionaryDownloadURL("https://00.00/");
  window2.loadFile(join4(htmlDistDir(), defaults2.main));
  window2.once("ready-to-show", () => {
    if (!options.hidden)
      mainWindow.show();
    if (process.env.NODE_ENV === "test") {
      mainWindow.maximize();
    }
  });
  if (window2.setSheetOffset) {
    window2.setSheetOffset(defaults2.headerHeight);
  }
  window2.webContents.on("will-navigate", (e, _url) => {
    e.preventDefault();
  });
  const saveBounds = (0, import_debounce2.default)(() => {
    const bounds = window2?.getBounds();
    if (bounds) {
      DesktopSettings.update({ bounds });
    }
  }, 1e3);
  window2.on("move", saveBounds);
  window2.on("resize", saveBounds);
  window2.once("show", () => {
    mainWindow.webContents.setZoomFactor(DesktopSettings.state.zoomFactor);
  });
  window2.on("close", () => {
  });
  window2.on("blur", () => {
    mainWindow.hidden = true;
    refreshTrayContextMenu();
  });
  window2.on("focus", () => {
    mainWindow.hidden = false;
    refreshTrayContextMenu();
    refresh();
  });
  const allowed_web_permissions = [
    "notifications",
    "pointerLock",
    "fullscreen",
    "clipboard-read",
    "media",
    "mediaKeySystem",
    "accessibility-events",
    "clipboard-sanitized-write"
    // not used:
    //  "display-capture", - not used
    //  "geolocation", - not used
    //  "midi" - not used
    //  "midiSysex" - not used
    // what is this about?
    //  "openExternal"
    //  "window-placement"
  ];
  const permission_handler = (permission) => {
    log6.info("preq", permission);
    if (!allowed_web_permissions.includes(permission)) {
      log6.info(
        `main window requested "${permission}" permission, but we denied it, because it is not in the list of allowed permissions.`
      );
      return false;
    } else {
      return true;
    }
  };
  window2.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    return permission_handler(permission);
  });
  window2.webContents.session.setPermissionRequestHandler(
    (_wc, permission, callback) => {
      callback(permission_handler(permission));
    }
  );
  window2.webContents.session.webRequest.onBeforeRequest(
    { urls: ["file://*"] },
    (details, callback) => {
      const pathname = fileURLToPath3(
        decodeURIComponent(new URL(details.url).href)
      );
      if (!isAbsolute(pathname) || pathname.includes("..")) {
        log6.errorWithoutStackTrace("tried to access relative path", pathname);
        return callback({ cancel: true });
      }
      if (pathname.startsWith(getAccountsPath())) {
        const relativePathInAccounts = pathname.replace(getAccountsPath(), "");
        const relativePathInAccount = relativePathInAccounts.slice(
          relativePathInAccounts.indexOf(sep, 1) + 1
        );
        if (ALLOWED_ACCOUNT_FOLDERS.find(
          (allowedPath) => relativePathInAccount.startsWith(allowedPath)
        )) {
          return callback({ cancel: false });
        }
      }
      if (ALLOWED_STATIC_FOLDERS.find(
        (allowedPath) => pathname.startsWith(allowedPath)
      )) {
        return callback({ cancel: false });
      }
      if (window2?.filePathWhiteList.includes(pathname)) {
        return callback({ cancel: false });
      }
      log6.errorWithoutStackTrace(
        "tried to access path that is not whitelisted",
        pathname
      );
      return callback({ cancel: true });
    }
  );
}
function hide() {
  window2?.hide();
}
function send(channel, ...args) {
  if (!window2) {
    log6.warn("window not defined, can't send ipc to renderer");
    return;
  }
  if (window2.isDestroyed()) {
    log6.info("window is destroyed. not sending message", args);
    return;
  }
  try {
    window2.webContents.send(channel, ...args);
  } catch (error) {
    log6.error("can not send message to window, error:", error);
  }
}
function setBounds(bounds, maximize) {
  if (!window2) {
    throw new Error("window does not exist, this should never happen");
  }
  if (maximize === true && !window2.isMaximized()) {
    log6.debug("setBounds: maximizing");
    window2.maximize();
  } else if (maximize === false && window2.isMaximized()) {
    log6.debug("setBounds: unmaximizing");
    window2.unmaximize();
  }
  const willBeMaximized = typeof maximize === "boolean" ? maximize : window2.isMaximized();
  if (!willBeMaximized) {
    log6.debug(`setBounds: setting bounds to ${JSON.stringify(bounds)}`);
    if (bounds.x === null && bounds.y === null) {
      const scr = electron.screen.getDisplayMatching(window2.getBounds());
      bounds.x = Math.round(
        scr.bounds.x + scr.bounds.width / 2 - bounds.width / 2
      );
      bounds.y = Math.round(
        scr.bounds.y + scr.bounds.height / 2 - bounds.height / 2
      );
      log6.debug(`setBounds: centered to ${JSON.stringify(bounds)}`);
    }
    if (bounds.contentBounds) {
      window2.setContentBounds(bounds, true);
    } else {
      window2.setBounds(bounds, true);
    }
  } else {
    log6.debug("setBounds: not setting bounds because of window maximization");
  }
}
function setProgress(progress) {
  window2?.setProgressBar(progress);
}
function setTitle(title) {
  if (title) {
    window2?.setTitle(`${appWindowTitle} - ${title}`);
  } else {
    window2?.setTitle(appWindowTitle);
  }
}
function show() {
  window2?.show();
}
function toggleAlwaysOnTop() {
  if (!window2)
    return;
  const flag = !window2.isAlwaysOnTop();
  log6.info(`toggleAlwaysOnTop ${flag}`);
  window2.setAlwaysOnTop(flag);
}
function isAlwaysOnTop() {
  return window2 ? window2.isAlwaysOnTop() : false;
}
function toggleDevTools() {
  if (!window2)
    return;
  log6.info("toggleDevTools");
  if (window2.webContents.isDevToolsOpened()) {
    window2.webContents.closeDevTools();
  } else {
    window2.webContents.openDevTools({ mode: "detach" });
  }
}
function chooseLanguage(locale) {
  window2?.webContents.send("chooseLanguage", locale);
}
function setZoomFactor(factor) {
  log6.info("setZoomFactor", factor);
  window2?.webContents.setZoomFactor(factor);
}

// src/isAppx.ts
init_cjs_shim();
import { platform as platform3 } from "os";
import { join as join5 } from "path";
import { app as app3 } from "electron";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
let appx = false;
async function isWindowsStorePackage() {
  if (platform3() === "win32") {
    const app_path = app3.getAppPath();
    try {
      const info = JSON.parse(
        await readFile(
          join5(app_path, "../../", "windows_build_info.json"),
          "utf-8"
        )
      );
      if (info.isAPPX) {
        console.info("App is probably running as appx");
        appx = info.isAPPX;
      }
    } catch (error) {
      console.warn(
        "Could not fetch windows build info, this is normal in dev mode"
      );
    }
  }
}
function mapPackagePath(path4) {
  const basePath = "AppData\\Local\\DeltaChat";
  const packagePath = "AppData\\Local\\Packages\\merlinux.DeltaChat_v2ry5hvxhdhyy\\LocalCache\\Local\\DeltaChat";
  if (appx && path4.indexOf(basePath) > -1) {
    const transformedPath = path4.replace(basePath, packagePath);
    if (existsSync(transformedPath)) {
      return transformedPath;
    }
  }
  return path4;
}
function getAppxPath(app_folder) {
  return join5(
    app_folder,
    "../Packages/merlinux.DeltaChat_v2ry5hvxhdhyy/LocalCache/Local/DeltaChat"
  );
}

// src/getLocaleDirectory.ts
init_cjs_shim();
import { existsSync as existsSync2 } from "fs";
import { join as join6, dirname as dirname3 } from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
const __dirname3 = dirname3(fileURLToPath4(import.meta.url));
const alternativeDirectory = process.env["DELTACHAT_LOCALE_DIR"];
let cachedResult = null;
function getLocaleDirectoryPath() {
  if (cachedResult) {
    return cachedResult;
  }
  const places = [
    alternativeDirectory,
    join6(__dirname3, "../_locales"),
    // packaged
    join6(__dirname3, "../../../_locales")
    // development
  ];
  if (alternativeDirectory && !isValidLocaleDirectory(alternativeDirectory)) {
    throw new Error(
      `Custom locale directory specified in \`DELTACHAT_LOCALE_DIR\` env var is not a valid locale directory.
      Make sure it exists and contains atleast the following files:
      - _languages.json        // index of what languages exist
      - _untranslated_en.json  // for untranslated strings
      - en.json                // for fallback
      
      Path to the invalid directory: ${alternativeDirectory}`
    );
  }
  const directory = places.find(isValidLocaleDirectory);
  if (!directory) {
    throw new Error("Failed to find locale data");
  }
  cachedResult = directory;
  return directory;
}
function isValidLocaleDirectory(path4) {
  return path4 !== void 0 && existsSync2(path4) && existsSync2(join6(path4, "_languages.json")) && existsSync2(join6(path4, "_untranslated_en.json")) && existsSync2(join6(path4, "en.json"));
}

// src/menu.ts
import { Menu as Menu2, shell } from "electron";
import { readFileSync } from "fs";
import { join as join7 } from "path";
const log7 = getLogger("main/menu");
const languages = (() => {
  const languagesFile = join7(getLocaleDirectoryPath(), "_languages.json");
  const rawLanguageList = JSON.parse(
    readFileSync(languagesFile, "utf8")
  );
  return Object.keys(rawLanguageList).map((locale) => ({
    locale,
    name: rawLanguageList[locale]
  })).filter(({ name }) => name.indexOf("*") === -1).sort(({ name: name1 }, { name: name2 }) => name1 > name2 ? 1 : -1);
})();
let logHandlerRef = null;
function refresh() {
  log7.info(`rebuilding menu with locale ${getCurrentLocaleDate().locale}`);
  if (!logHandlerRef) {
    log7.critical("logHandlerRef not defined, could not build menu");
    return;
  }
  const template = getMenuTemplate(logHandlerRef);
  const menu = Menu2.buildFromTemplate(template);
  const item = getMenuItem(menu, tx("global_menu_view_floatontop_desktop"));
  if (item)
    item.checked = isAlwaysOnTop();
  const isMac2 = process.platform === "darwin";
  if (isMac2 === true) {
    Menu2.setApplicationMenu(menu);
    return;
  }
  window2?.setMenu(menu);
}
function init2(logHandler2) {
  logHandlerRef = logHandler2;
  refresh();
}
function getAvailableLanguages() {
  const { locale: currentLocale } = getCurrentLocaleDate();
  return languages.map(({ locale, name }) => {
    return {
      label: name,
      type: "radio",
      checked: locale === currentLocale,
      click: () => {
        DesktopSettings.update({ locale });
        chooseLanguage(locale);
      }
    };
  });
}
function getZoomFactors() {
  const zoomFactors = [
    { scale: 0.6, key: "extra_small" },
    { scale: 0.8, key: "small" },
    { scale: 1, key: "normal" },
    { scale: 1.2, key: "large" },
    { scale: 1.4, key: "extra_large" }
  ];
  const currentZoomFactor = DesktopSettings.state.zoomFactor;
  if (zoomFactors.map(({ scale }) => scale).indexOf(currentZoomFactor) === -1)
    zoomFactors.push({
      scale: currentZoomFactor,
      key: "custom"
    });
  return zoomFactors.map(({ key, scale }) => {
    return {
      label: !(scale === 1 && key === "custom") ? `${scale}x ${tx(key)}` : tx("custom"),
      type: "radio",
      checked: scale === DesktopSettings.state.zoomFactor && !(scale === 1 && key === "custom"),
      click: () => {
        if (key !== "custom") {
          DesktopSettings.update({ zoomFactor: scale });
          setZoomFactor(scale);
        } else {
        }
      }
    };
  });
}
function getAppMenu(window3) {
  const isMainWindow = window3 === window2;
  const extraItemsForMainWindow = [
    {
      label: tx("global_menu_help_about_desktop"),
      click: () => {
        send("showAboutDialog");
      }
    },
    { type: "separator" },
    {
      label: tx("menu_settings"),
      click: () => {
        send("showSettingsDialog");
      },
      accelerator: "Cmd+,"
    },
    { type: "separator" }
  ];
  return {
    label: appWindowTitle,
    submenu: [
      ...isMainWindow ? extraItemsForMainWindow : [],
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      ...isMainWindow ? [
        {
          // because menubar stays when it's closed and apple wants that the user can reopen it via the menu bar
          label: tx("show_window"),
          click: () => {
            show();
          }
        }
      ] : [],
      {
        label: tx("global_menu_file_quit_desktop"),
        role: "quit",
        accelerator: "Cmd+q"
      }
    ]
  };
}
function getFileMenu(window3, isMac2) {
  const fileMenuNonMac = {
    label: tx("global_menu_file_desktop"),
    submenu: (() => {
      if (window3 === window2) {
        return [
          {
            label: tx("menu_settings"),
            click: () => {
              send("showSettingsDialog");
            },
            accelerator: "Ctrl+,"
          },
          {
            label: tx("global_menu_file_quit_desktop"),
            click: quitDeltaChat,
            accelerator: "Ctrl+q"
          }
        ];
      } else {
        return [
          {
            label: tx("close_window"),
            click: () => window3?.close(),
            accelerator: "Ctrl+q"
          }
        ];
      }
    })()
  };
  const fileMenuMac = {
    label: tx("global_menu_file_desktop"),
    submenu: [
      {
        label: tx("close_window"),
        click: () => {
          window3?.close();
          if (isMac2) {
            refresh();
          }
        },
        accelerator: "Cmd+w"
      }
    ]
  };
  return isMac2 ? fileMenuMac : fileMenuNonMac;
}
function getEditMenu() {
  return {
    label: tx("global_menu_edit_desktop"),
    submenu: [
      {
        label: tx("global_menu_edit_undo_desktop"),
        role: "undo"
      },
      {
        label: tx("global_menu_edit_redo_desktop"),
        role: "redo"
      },
      {
        type: "separator"
      },
      {
        label: tx("global_menu_edit_cut_desktop"),
        role: "cut"
      },
      {
        label: tx("global_menu_edit_copy_desktop"),
        role: "copy"
      },
      {
        label: tx("global_menu_edit_paste_desktop"),
        role: "paste"
      },
      {
        label: tx("delete"),
        role: "delete"
      },
      {
        label: tx("menu_select_all"),
        role: "selectAll"
      }
    ]
  };
}
function getHelpMenu(isMac2) {
  return {
    label: tx("global_menu_help_desktop"),
    role: "help",
    submenu: [
      {
        label: tx("menu_help"),
        click: () => {
          send("showHelpDialog");
        },
        accelerator: "F1"
      },
      {
        label: tx("keybindings"),
        click: () => {
          window2?.show();
          window2?.focus();
          send("showKeybindingsDialog");
        },
        accelerator: isMac2 ? "Cmd+/" : "Ctrl+/"
      },
      {
        type: "separator"
      },
      {
        label: tx("delta_chat_homepage"),
        click: () => {
          shell.openExternal(homePageUrl);
        }
      },
      {
        label: tx("contribute"),
        click: () => {
          shell.openExternal("https://delta.chat/contribute");
        }
      },
      {
        label: tx("global_menu_help_report_desktop"),
        click: () => {
          shell.openExternal(gitHubIssuesUrl);
        }
      },
      {
        type: "separator"
      },
      {
        label: tx("global_menu_help_about_desktop"),
        click: () => {
          window2?.show();
          window2?.focus();
          send("showAboutDialog");
        }
      }
    ]
  };
}
function getMenuTemplate(logHandler2) {
  const isMac2 = process.platform === "darwin";
  return [
    ...isMac2 ? [getAppMenu(window2)] : [],
    getFileMenu(window2, isMac2),
    getEditMenu(),
    {
      label: tx("global_menu_view_desktop"),
      submenu: [
        {
          label: tx("global_menu_view_floatontop_desktop"),
          type: "checkbox",
          click: () => toggleAlwaysOnTop()
        },
        {
          label: tx("zoom"),
          submenu: getZoomFactors()
        },
        {
          label: tx("pref_language"),
          submenu: getAvailableLanguages()
        },
        {
          type: "separator"
        },
        {
          label: tx("global_menu_view_developer_desktop"),
          submenu: [
            {
              label: tx("global_menu_view_developer_tools_desktop"),
              accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
              click: () => toggleDevTools()
            },
            {
              label: tx("menu.view.developer.open.log.folder"),
              click: () => {
                shell.openPath(mapPackagePath(getLogsPath()));
              }
            },
            {
              label: tx("menu.view.developer.open.current.log.file"),
              click: () => {
                shell.openPath(mapPackagePath(logHandler2.logFilePath()));
              }
            }
          ]
        }
      ]
    },
    getHelpMenu(isMac2)
  ];
}
function getMenuItem(menu, label) {
  for (let i = 0; i < menu.items.length; i++) {
    const menuItem = menu.items[i].submenu?.items.find(function(item) {
      return item.label === label;
    });
    if (menuItem)
      return menuItem;
  }
}

// src/load-translations.ts
import path2 from "path";
import fs from "fs";
import { ipcMain } from "electron";
const log8 = getLogger("load-translations");
let currentlocaleData = null;
function getCurrentLocaleDate() {
  if (currentlocaleData === null) {
    log8.error("tried to get locale data before init");
    throw new Error("no locale data is loaded yet");
  }
  return currentlocaleData;
}
let translateFunction = null;
var tx = function(key, substitutions, raw_opts) {
  if (translateFunction === null) {
    log8.error("tried to use translation function before init");
    return key;
  }
  return translateFunction(key, substitutions, raw_opts);
};
function setLanguage(locale) {
  const localeData = loadTranslations(locale);
  currentlocaleData = localeData;
  translateFunction = translate(
    localeData.locale,
    localeData.messages
  );
}
function loadTranslations(locale) {
  const messagesEnglish = getLocaleMessages(retrieveLocaleFile("en"));
  let messages;
  let localeFile = retrieveLocaleFile(locale);
  let localeMessages = getLocaleMessages(localeFile);
  if (!localeMessages && locale.indexOf("-") !== -1) {
    locale = locale.split("-")[0];
    localeFile = retrieveLocaleFile(locale);
    localeMessages = getLocaleMessages(localeFile);
  } else if (!localeMessages) {
    log8.error(`Could not load messages for ${locale}`, locale);
    locale = "en";
    messages = messagesEnglish;
  }
  if (localeMessages) {
    messages = Object.assign({}, messagesEnglish, localeMessages);
  }
  const experimentalFile = retrieveLocaleFile("_untranslated_en");
  const experimentalMessages = getLocaleMessages(experimentalFile);
  if (experimentalMessages) {
    messages = Object.assign(messages, experimentalMessages);
  } else {
    log8.debug(`No experimental language file (${experimentalFile}) found`);
  }
  log8.debug(messages["no_chat_selected_suggestion_desktop"]);
  return { messages, locale };
}
function retrieveLocaleFile(locale) {
  const onDiskLocale = locale.replace("-", "_");
  return path2.join(getLocaleDirectoryPath(), onDiskLocale + ".json");
}
function getLocaleMessages(file) {
  if (!fs.existsSync(file))
    return false;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    log8.error(`JSON parse error in language file '${file}'`, err);
    throw err;
  }
}
ipcMain.handle("getLocaleData", (_ev, locale) => {
  if (locale) {
    loadTranslations(locale);
  }
  return getCurrentLocaleDate();
});
ipcMain.handle("setLocale", (_ev, locale) => {
  setLanguage(locale);
  refresh();
});

// src/electron-context-menu.ts
import electron2 from "electron";
const webContents = (win2) => win2.webContents;
const removeUnusedMenuItems = (menuTemplate) => {
  let notDeletedPreviousElement;
  return menuTemplate.filter((menuItem) => {
    if (!menuItem) {
      return false;
    } else if (typeof menuItem === "object" && menuItem.visible === false) {
      return false;
    }
    return true;
  }).filter((item, index, array) => {
    const menuItem = item;
    const items = array;
    const toDelete = menuItem.type === "separator" && (!notDeletedPreviousElement || index === array.length - 1 || items[index + 1].type === "separator");
    notDeletedPreviousElement = toDelete ? notDeletedPreviousElement : menuItem;
    return !toDelete;
  });
};
const create = (win2) => {
  const enableSpellChecking = false;
  const handleContextMenu = (_event, props) => {
    const { editFlags } = props;
    const hasText = props.selectionText.trim().length > 0;
    const can = (type) => editFlags[`can${type}`] && hasText;
    const defaultActions = {
      separator: () => ({ type: "separator" }),
      learnSpelling: () => ({
        id: "learnSpelling",
        label: tx("menu_learn_spelling"),
        visible: Boolean(props.isEditable && hasText && props.misspelledWord),
        click() {
          const target = webContents(win2);
          target.session.addWordToSpellCheckerDictionary(props.misspelledWord);
        }
      }),
      cut: () => ({
        id: "cut",
        label: tx("global_menu_edit_cut_desktop"),
        enabled: can("Cut"),
        visible: props.isEditable,
        click(_menuItem) {
          const target = webContents(win2);
          if (target) {
            target.cut();
          } else {
            electron2.clipboard.writeText(props.selectionText);
          }
        }
      }),
      copy: () => ({
        id: "copy",
        label: tx("global_menu_edit_copy_desktop"),
        enabled: can("Copy"),
        visible: props.isEditable || hasText,
        click() {
          const target = webContents(win2);
          if (target) {
            target.copy();
          } else {
            electron2.clipboard.writeText(props.selectionText);
          }
        }
      }),
      paste: () => ({
        id: "paste",
        label: tx("global_menu_edit_paste_desktop"),
        enabled: editFlags.canPaste,
        visible: props.isEditable,
        click() {
          const target = webContents(win2);
          target.paste();
        }
      }),
      copyLink: () => ({
        id: "copyLink",
        label: tx("menu_copy_link_to_clipboard"),
        visible: props.linkURL.length !== 0 && props.mediaType === "none",
        click() {
          electron2.clipboard.write({
            bookmark: props.linkText,
            text: props.linkURL
          });
        }
      }),
      copyImage: () => ({
        id: "copyImage",
        label: tx("menu_copy_image_to_clipboard"),
        visible: props.mediaType === "image",
        click() {
          webContents(win2).copyImageAt(props.x, props.y);
        }
      })
    };
    function word(suggestion) {
      return {
        id: "dictionarySuggestions",
        label: suggestion,
        visible: Boolean(props.isEditable && hasText && props.misspelledWord),
        click(menuItem) {
          if (menuItem.label) {
            const target = webContents(win2);
            target.insertText(menuItem.label);
          }
        }
      };
    }
    let dictionarySuggestions = [];
    if (enableSpellChecking) {
      if (hasText && props.misspelledWord && props.dictionarySuggestions.length > 0) {
        dictionarySuggestions = props.dictionarySuggestions.map(
          (suggestion) => word(suggestion)
        );
      } else {
        dictionarySuggestions.push({
          id: "dictionarySuggestions",
          label: tx("no_spellcheck_suggestions_found"),
          visible: Boolean(hasText && props.misspelledWord),
          enabled: false
        });
      }
    }
    let menuTemplate = [
      dictionarySuggestions.length > 0 && defaultActions.separator(),
      ...dictionarySuggestions,
      defaultActions.separator(),
      enableSpellChecking && defaultActions.learnSpelling(),
      defaultActions.separator(),
      defaultActions.cut(),
      defaultActions.copy(),
      defaultActions.paste(),
      defaultActions.separator(),
      defaultActions.copyImage(),
      defaultActions.separator(),
      defaultActions.copyLink(),
      defaultActions.separator()
    ];
    menuTemplate = removeUnusedMenuItems(menuTemplate);
    if (menuTemplate.length > 0) {
      const menu = electron2.Menu.buildFromTemplate(menuTemplate);
      menu.popup({ window: win2 });
    }
  };
  webContents(win2).on("context-menu", handleContextMenu);
  return () => {
    if (win2.isDestroyed()) {
      return;
    }
    webContents(win2).removeListener("context-menu", handleContextMenu);
  };
};
const ContextMenu = () => {
  let isDisposed = false;
  const disposables = [];
  const init4 = (win2) => {
    if (isDisposed) {
      return;
    }
    const disposeMenu = create(win2);
    disposables.push(disposeMenu);
    const removeDisposable = () => {
      const index = disposables.indexOf(disposeMenu);
      if (index !== -1) {
        disposables.splice(index, 1);
      }
    };
    if (typeof win2.once !== "undefined") {
      win2.once("closed", removeDisposable);
    }
    disposables.push(() => {
      win2.off("closed", removeDisposable);
    });
  };
  const dispose = () => {
    for (const dispose2 of disposables) {
      dispose2();
    }
    disposables.length = 0;
    isDisposed = true;
  };
  for (const win2 of electron2.BrowserWindow.getAllWindows()) {
    init4(win2);
  }
  const app13 = electron2.app;
  const onWindowCreated = (_event, win2) => {
    init4(win2);
  };
  app13.on("browser-window-created", onWindowCreated);
  disposables.push(() => {
    app13.removeListener("browser-window-created", onWindowCreated);
  });
  return dispose;
};
const electron_context_menu_default = ContextMenu;

// src/help_menu.ts
init_cjs_shim();
function getHelpMenu2() {
  console.info(`Options:

Flag
--                              indicates the end of DeltaChat options
-h, --help                      Print DeltaChat command line options (currently set).
--minimized                     Start deltachat in minimized mode with trayicon (trayicon will be activated
                                for this session regardless whether it's disabled)
-v, --version                   Prints DeltaChat version.

Development Options
--translation-watch             enable auto-reload for _locales/_untranslated_en.json
--dev-mode                      opens electron devtools and activates --log-debug & --log-to-console

Theme
--theme <theme-id>              set a specific theme (see THEMES.md)
--theme-watch                   enable auto-reload for the active theme

Logging
--log-debug                     Log debug messages
--log-to-console                Output the log to stdout / Chrome dev console
--machine-readable-stack        Enable JSON stack trace
--no-color                      Disable colors in the output of main process

For more info on logging see LOGGING.md.)`);
}

// src/resume_from_sleep.ts
init_cjs_shim();
import { powerMonitor } from "electron";
function onResumeFromSleep() {
  window2?.webContents.send("onResumeFromSleep");
}
function initialisePowerMonitor() {
  powerMonitor.on("resume", onResumeFromSleep);
  powerMonitor.on("unlock-screen", onResumeFromSleep);
  powerMonitor.on("user-did-become-active", onResumeFromSleep);
}

// src/log-handler.ts
init_cjs_shim();
import { createWriteStream } from "fs";
import { join as join8 } from "path";
import { stdout, stderr } from "process";
stdout.on("error", () => {
});
stderr.on("error", () => {
});
function logName() {
  const dir = getLogsPath();
  const d = /* @__PURE__ */ new Date();
  function pad(number) {
    return number < 10 ? "0" + number : number;
  }
  const fileName = [
    `${d.getFullYear()}-`,
    `${pad(d.getMonth() + 1)}-`,
    `${pad(d.getDate())}-`,
    `${pad(d.getHours())}-`,
    `${pad(d.getMinutes())}-`,
    `${pad(d.getSeconds())}`,
    ".log"
  ].join("");
  return join8(dir, fileName);
}
function createLogHandler() {
  const fileName = logName();
  const stream = createWriteStream(fileName, { flags: "w" });
  console.log(`Logfile: ${fileName}`);
  return {
    /**
     * Internal log handler. Do not call directly!
     * @param channel The part/module where the message was logged from, e.g. 'main/deltachat'
     * @param level DEBUG, INFO, WARNING, ERROR or CRITICAL
     * @param stacktrace Stack trace if WARNING, ERROR or CRITICAL
     * @param ...args Variadic parameters. Stringified before logged to file
     */
    log: (channel, level, stacktrace, ...args) => {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      let line = [timestamp, fillString(channel, 22), level];
      line = line.concat(
        [stacktrace, ...args].map((value) => JSON.stringify(value))
      );
      if (stream.writable) {
        stream.write(`${line.join("	")}
`);
      } else {
        console.warn("tried to log something after logger shut down", {
          channel,
          level,
          args,
          stacktrace
        });
      }
    },
    end: () => stream.end(),
    logFilePath: () => fileName
  };
}
import { readdir, lstat, unlink } from "fs/promises";
async function cleanupLogFolder() {
  const log20 = getLogger("logger/log-cleanup");
  const logDir = getLogsPath();
  const logDirContent = await readdir(logDir);
  const filesWithDates = await Promise.all(
    logDirContent.map(async (logFileName) => ({
      filename: logFileName,
      mtime: (await lstat(join8(logDir, logFileName))).mtime.getTime()
    }))
  );
  const sortedFiles = filesWithDates.sort((a, b) => a.mtime - b.mtime);
  if (sortedFiles.length > 10) {
    sortedFiles.splice(sortedFiles.length - 11);
    const fileCount = await Promise.all(
      sortedFiles.map(({ filename }) => unlink(join8(logDir, filename)))
    );
    log20.info(`Successfuly deleted ${fileCount.length} old logfiles`);
  } else {
    log20.debug("Nothing to do (not more than 10 logfiles to delete)");
  }
}
function fillString(string, n) {
  if (string.length < n) {
    return string + " ".repeat(n - string.length);
  }
  return string;
}

// src/ipc.ts
init_cjs_shim();

// src/windows/help.ts
init_cjs_shim();
import { BrowserWindow as BrowserWindow6, Menu as Menu3, shell as shell2 } from "electron";
import { join as join9 } from "path";
import { stat } from "fs/promises";
import { platform as platform4 } from "os";
const log9 = getLogger("main/help");
async function getHelpFileForLang(locale) {
  const contentFilePath = join9(htmlDistDir(), `help/${locale}/help.html`);
  try {
    if (!(await stat(join9(contentFilePath))).isFile()) {
      log9.warn("contentFilePath not a file");
      throw new Error("contentFilePath not a file");
    }
    return contentFilePath;
  } catch (error) {
    log9.warn(
      `Did not find help file for language ${locale}, falling back to english`
    );
    return join9(htmlDistDir(), `help/en/help.html`);
  }
}
let win = null;
async function openHelpWindow(locale, anchor) {
  if (win) {
    win.focus();
    if (anchor) {
      win.webContents.executeJavaScript(`
        document.getElementById(atob("${btoa(
        anchor
      )}"))?.scrollIntoView({"behavior":"smooth"})
      `);
    }
    return;
  }
  log9.debug("open help", locale);
  const defaults2 = {
    bounds: {
      width: 500,
      height: 638
    },
    headerHeight: 36,
    minWidth: 450,
    minHeight: 450
  };
  const help_window = win = new BrowserWindow6({
    backgroundColor: "#282828",
    darkTheme: true,
    // Forces dark theme (GTK+3)
    icon: appIcon(),
    show: false,
    title: appWindowTitle + " - " + tx("menu_help"),
    useContentSize: true,
    // Specify web page size without OS chrome
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      spellcheck: false
    },
    alwaysOnTop: window2?.isAlwaysOnTop()
  });
  setContentProtection(help_window);
  const removeScreenChangeListeners = initMinWinDimensionHandling(
    help_window,
    defaults2.minWidth,
    defaults2.minHeight
  );
  const url2 = await getHelpFileForLang(locale);
  log9.debug(url2);
  win.loadFile(url2);
  win.once("ready-to-show", async () => {
    if (anchor) {
      await help_window.webContents.executeJavaScript(`
      document.getElementById(atob("${btoa(
        anchor
      )}"))?.scrollIntoView({"behavior":"instant"})
      `);
    }
    help_window.show();
  });
  if (win.setSheetOffset) {
    win.setSheetOffset(defaults2.headerHeight);
  }
  win.webContents.on("will-navigate", (_ev, url3) => {
    log9.debug("open ", url3);
    shell2.openExternal(url3);
  });
  win.on("close", (_e) => {
    win = null;
    removeScreenChangeListeners();
  });
  win.setMenu(Menu3.buildFromTemplate([{ role: "viewMenu" }]));
  win.webContents.executeJavaScript(`
    const body = document.getElementsByTagName('body')[0];
    const back_btn = document.createElement('button');
    back_btn.className = 'back-btn';
    back_btn.onclick = (ev) => {document.body.scrollTop = 0; document.documentElement.scrollTop = 0;};
    back_btn.innerText = '\u2191 ${tx("menu_scroll_to_top")}';
    body.append(back_btn);
  `);
  win.webContents.session.setPermissionCheckHandler((_wc, _permission) => false);
  win.webContents.session.setPermissionRequestHandler(
    (_wc, _permission, callback) => callback(false)
  );
  const isMac2 = platform4() === "darwin";
  const makeMenu = () => {
    return Menu3.buildFromTemplate([
      ...isMac2 ? [getAppMenu(help_window)] : [],
      getFileMenu(win, isMac2),
      {
        label: tx("global_menu_edit_desktop"),
        submenu: [
          {
            label: tx("global_menu_edit_copy_desktop"),
            role: "copy"
          },
          {
            label: tx("menu_select_all"),
            role: "selectAll"
          }
        ]
      },
      {
        label: tx("global_menu_view_desktop"),
        submenu: [
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          {
            label: tx("global_menu_view_floatontop_desktop"),
            type: "checkbox",
            checked: win?.isAlwaysOnTop(),
            click: () => {
              win?.setAlwaysOnTop(!win.isAlwaysOnTop());
              if (isMac2) {
                win?.setMenu(makeMenu());
              } else {
                Menu3.setApplicationMenu(makeMenu());
              }
            }
          },
          { role: "togglefullscreen" }
        ]
      },
      getHelpMenu(isMac2)
    ]);
  };
  if (!isMac2) {
    win.setMenu(makeMenu());
  }
  win.on("focus", () => {
    if (isMac2) {
      Menu3.setApplicationMenu(makeMenu());
    }
  });
  win.on("blur", () => {
    if (isMac2) {
      refresh();
    }
  });
}

// src/windows/html_email.ts
init_cjs_shim();

// ../shared/util.ts
init_cjs_shim();
function truncateText(text, max_len) {
  if (text.length > max_len) {
    return text.slice(0, max_len) + "\u2026";
  } else {
    return text;
  }
}
function isInviteLink(url2) {
  return url2.startsWith("https://i.delta.chat/") && url2.includes("#");
}
function throttle(fn, wait) {
  let inThrottle, timeout, lastTime;
  const ret = (...args) => {
    if (!inThrottle) {
      fn(...args);
      lastTime = performance.now();
      inThrottle = true;
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(
        () => {
          fn(...args);
          lastTime = performance.now();
        },
        Math.max(wait - (performance.now() - lastTime), 0)
      );
    }
  };
  ret.cancel = () => {
    clearTimeout(timeout);
  };
  return ret;
}

// src/open_url.ts
init_cjs_shim();
import { app as rawApp2, ipcMain as ipcMain2 } from "electron";
import { readFile as readFile2 } from "fs/promises";
import { basename } from "path";
import { platform as platform5 } from "os";
const log10 = getLogger("main/open_url");
const app4 = rawApp2;
if (platform5() !== "linux") {
  app4.setAsDefaultProtocolClient("openpgp4fpr");
  app4.setAsDefaultProtocolClient("OPENPGP4FPR");
  app4.setAsDefaultProtocolClient("dcaccount");
  app4.setAsDefaultProtocolClient("DCACCOUNT");
  app4.setAsDefaultProtocolClient("dclogin");
  app4.setAsDefaultProtocolClient("DCLOGIN");
}
let frontend_ready = false;
ipcMain2.once("frontendReady", () => {
  frontend_ready = true;
});
function sendToFrontend(url2) {
  if (url2.toUpperCase().startsWith("OPENPGP4FPR") && url2.indexOf("#") === -1) {
    send("open-url", url2.replace("%23", "#"));
  } else {
    send("open-url", url2);
  }
}
const open_url = function(url2) {
  log10.info("open_url was called");
  const sendOpenUrlEvent = () => {
    log10.info("open-url: Sending url to frontend.");
    if (frontend_ready) {
      sendToFrontend(url2);
    } else {
      ipcMain2.once("frontendReady", () => {
        sendToFrontend(url2);
      });
    }
  };
  log10.debug("open-url: sending to frontend:", url2);
  if (app4.ipcReady)
    return sendOpenUrlEvent();
  log10.debug("open-url: Waiting for ipc to be ready before opening url.");
  app4.once("ipcReady", () => {
    log10.debug("open-url: IPC ready.");
    sendOpenUrlEvent();
  });
};
app4.on("open-url", (event, url2) => {
  log10.info("open url event");
  if (event) {
    event.preventDefault();
    app4.focus();
    window2?.focus();
  }
  open_url(url2);
});
async function handleWebxdcFileOpen(path4) {
  log10.info("open file", path4);
  if (!path4.endsWith(".xdc")) {
    log10.info("handleWebxdcFileOpen, path does not contain .xdc", path4);
    return;
  }
  app4.focus();
  window2?.focus();
  const buffer = await readFile2(path4);
  if (!app4.ipcReady) {
    await new Promise((res) => app4.once("ipcReady", res));
  }
  if (!frontend_ready) {
    await new Promise((res) => ipcMain2.once("frontendReady", res));
  }
  window2?.webContents.send(
    "webxdc.sendToChat",
    { file_name: basename(path4), file_content: buffer.toString("base64") },
    null
  );
}
app4.on("open-file", async (event, path4) => {
  if (event) {
    event.preventDefault();
  }
  handleWebxdcFileOpen(path4);
});
function openUrlsAndFilesFromArgv(argv) {
  args_loop:
    for (let i = 1; i < argv.length; i++) {
      const arg = argv[i];
      if (arg.endsWith(".xdc")) {
        log10.debug(
          "open-url: process something that looks like it could be a webxc file:",
          arg
        );
        handleWebxdcFileOpen(arg);
        continue;
      }
      if (!arg.includes(":")) {
        continue;
      }
      log10.debug(
        "open-url: process something that looks like it could be a scheme:",
        arg
      );
      for (const expectedScheme of supportedURISchemes) {
        if (arg.startsWith(expectedScheme.toUpperCase()) || arg.startsWith(expectedScheme.toLowerCase())) {
          log10.debug("open-url: Detected URI: ", arg);
          open_url(arg);
          continue args_loop;
        }
      }
    }
}
app4.on("second-instance", (_event, argv) => {
  log10.debug("Someone tried to run a second instance");
  openUrlsAndFilesFromArgv(argv);
  if (window2) {
    showDeltaChat();
  }
});

// src/themes.ts
init_cjs_shim();

// ../shared/themes.ts
init_cjs_shim();
function parseThemeMetaData(rawTheme) {
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
const HIDDEN_THEME_PREFIX = "dev_";

// src/themes.ts
import { existsSync as existsSync3, watchFile } from "fs";
import { readFile as readFile3, readdir as readdir2 } from "fs/promises";
import { join as join10, basename as basename2 } from "path";
import { app as rawApp3, ipcMain as ipcMain3, nativeTheme } from "electron";
const app5 = rawApp3;
const log11 = getLogger("main/themes");
const dc_theme_dir = join10(htmlDistDir(), "themes");
async function readThemeDir(path4, prefix) {
  const files = await readdir2(path4);
  return Promise.all(
    files.filter((f) => f.endsWith(".css") && f.charAt(0) !== "_").map(async (f) => {
      const address = prefix + ":" + basename2(f, ".css");
      const file_content = await readFile3(join10(path4, f), "utf-8");
      try {
        const theme_meta = parseThemeMetaData(file_content);
        return {
          name: theme_meta.name,
          description: theme_meta.description,
          address,
          is_prototype: f.startsWith(HIDDEN_THEME_PREFIX)
        };
      } catch (error) {
        log11.error("Error while parsing theme ${address}: ", error);
        return {
          name: address + " [Invalid Meta]",
          description: "[missing description]",
          address: prefix + ":" + basename2(f, ".css"),
          is_prototype: f.startsWith(HIDDEN_THEME_PREFIX)
        };
      }
    })
  );
}
async function getAvailableThemes() {
  return [
    ...await readThemeDir(dc_theme_dir, "dc"),
    ...await readThemeDir(getCustomThemesPath(), "custom")
  ];
}
async function loadTheme(theme_address) {
  const effective_path = resolveThemeAddress(theme_address);
  log11.debug("load theme file", theme_address, effective_path);
  const themedata = await readFile3(effective_path, "utf-8");
  log11.debug("render theme data");
  const theme_meta = parseThemeMetaData(themedata);
  log11.debug("render theme data for theme:", theme_meta);
  return {
    theme: {
      name: theme_meta.name,
      description: theme_meta.description,
      address: theme_address,
      is_prototype: basename2(effective_path).startsWith(HIDDEN_THEME_PREFIX)
    },
    data: themedata
  };
}
function systemDefault() {
  if (nativeTheme.shouldUseDarkColors) {
    return ["dc", "dark"];
  } else {
    return ["dc", "light"];
  }
}
function resolveThemeAddress(address) {
  const addressParts = address != "system" ? address.split(":") : systemDefault();
  let realPath = "";
  if (addressParts.length != 2)
    throw "not an theme address, must have the format [location]:[themename]";
  if (addressParts[0] == "dc") {
    realPath = `${dc_theme_dir}`;
  } else if (addressParts[0] == "custom") {
    realPath = getCustomThemesPath();
  } else {
    throw 'unknown "location", valid locations are dc or custom';
  }
  const result = join10(
    realPath,
    addressParts[1].replace(/\/|\\|\.\./g, "") + ".css"
  );
  if (existsSync3(result)) {
    return result;
  } else {
    throw "theme " + address + " not found at: " + result;
  }
}
function acceptThemeCLI() {
  if (app5.rc["theme"]) {
    log11.info(`trying to load theme from '${app5.rc["theme"]}'`);
    try {
      resolveThemeAddress(app5.rc["theme"]);
    } catch (error) {
      log11.error("THEME NOT FOUND", { error, path: app5.rc["theme"] });
      throw new Error(
        `THEME "${app5.rc["theme"]}" NOT FOUND,
this is fatal because the user specified it via cli argument.
If you did not specify this, ask the person which installed deltachat for you to remove the cli argument again.

If they are not available find the shortcut/.desktop file yourself and edit it to not contain the "--theme" argument.
Using --theme is for developers and theme creators ONLY and should not be used by normal users
If you have question or need help, feel free to ask in our forum https://support.delta.chat.`
      );
    }
    DesktopSettings.update({ activeTheme: app5.rc["theme"] });
    log11.info(`set theme`);
    if (app5.rc["theme-watch"]) {
      log11.info("theme-watch: activated", app5.rc["theme-watch"]);
      watchFile(resolveThemeAddress(app5.rc["theme"]), (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          log11.info(
            "theme-watch: File changed reminding frontend to reload theme"
          );
          app5.ipcReady && send("theme-update");
        }
      });
    }
  }
  nativeTheme.on("updated", () => {
    send("theme-update");
  });
}
ipcMain3.handle("themes.getActiveTheme", async () => {
  try {
    log11.debug("theme", DesktopSettings.state.activeTheme);
    return await loadTheme(DesktopSettings.state.activeTheme);
  } catch (error) {
    log11.error("loading theme failed:", error);
    return null;
  }
});
ipcMain3.handle("themes.getAvailableThemes", getAvailableThemes);

// src/windows/html_email.ts
import electron3, {
  dialog,
  Menu as Menu4,
  MenuItem,
  nativeTheme as nativeTheme2,
  session as session2,
  shell as shell3,
  WebContentsView
} from "electron";
import { clipboard } from "electron/common";
import { join as join11 } from "path";
import { platform as platform6 } from "os";
const log12 = getLogger("html_email");
const open_windows = {};
function openHtmlEmailWindow(account_id, message_id, isContactRequest, subject, from, receiveTime, htmlEmail) {
  const window_id = `${account_id}.${message_id}`;
  if (open_windows[window_id]) {
    open_windows[window_id].focus();
    return;
  }
  const initialBounds = DesktopSettings.state.HTMLEmailWindowBounds || {
    height: 621,
    width: 800,
    x: void 0,
    y: void 0
  };
  const window3 = open_windows[window_id] = new electron3.BrowserWindow({
    backgroundColor: "#282828",
    // backgroundThrottling: false, // do not throttle animations/timers when page is background
    darkTheme: true,
    // Forces dark theme (GTK+3)
    icon: appIcon(),
    show: false,
    title: `${truncateText(subject, 42)} \u2013 ${truncateText(from, 40)}`,
    height: initialBounds.height,
    width: initialBounds.width,
    x: initialBounds.x,
    y: initialBounds.y,
    webPreferences: {
      nodeIntegration: false,
      preload: join11(
        htmlDistDir(),
        "electron_html_email_view/electron_html_email_view_preload.js"
      ),
      spellcheck: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      contextIsolation: true
    },
    alwaysOnTop: main_exports?.isAlwaysOnTop()
  });
  window3.webContents.setZoomFactor(DesktopSettings.state.zoomFactor);
  setContentProtection(window3);
  const removeScreenChangeListeners = initMinWinDimensionHandling(
    window3,
    400,
    300
  );
  const loadRemoteContentAtStart = DesktopSettings.state.HTMLEmailAlwaysLoadRemoteContent && !isContactRequest;
  window3.webContents.ipc.handle("html_email:get_info", (_) => ({
    subject,
    from,
    receiveTime,
    networkButtonLabelText: tx("load_remote_content"),
    toggle_network: loadRemoteContentAtStart
  }));
  nativeTheme2.on("updated", () => {
    try {
      window3.webContents.ipc.emit("theme-update");
    } catch (error) {
    }
  });
  window3.webContents.ipc.handle(
    "get-theme",
    async () => (await loadTheme(DesktopSettings.state.activeTheme)).data
  );
  window3.webContents.on("will-navigate", (e, _url) => {
    e.preventDefault();
  });
  window3.once("ready-to-show", () => {
    window3.show();
  });
  window3.on("close", () => {
    context_menu_handle?.();
    delete open_windows[window_id];
    removeScreenChangeListeners();
  });
  const isMac2 = platform6() === "darwin";
  const makeMenu = () => {
    return Menu4.buildFromTemplate([
      ...isMac2 ? [getAppMenu(window3)] : [],
      getFileMenu(window3, isMac2),
      {
        label: tx("global_menu_edit_desktop"),
        submenu: [
          {
            label: tx("global_menu_edit_copy_desktop"),
            role: "copy"
          },
          {
            label: tx("menu_select_all"),
            click: () => {
              sandboxedView.webContents.focus();
              sandboxedView.webContents.selectAll();
            },
            accelerator: isMac2 ? "Cmd+A" : "Ctrl+A"
          }
        ]
      },
      {
        label: tx("global_menu_view_desktop"),
        submenu: [
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          {
            label: tx("global_menu_view_floatontop_desktop"),
            type: "checkbox",
            checked: window3.isAlwaysOnTop(),
            click: () => {
              window3.setAlwaysOnTop(!window3.isAlwaysOnTop());
              if (platform6() !== "darwin") {
                window3.setMenu(makeMenu());
              } else {
                Menu4.setApplicationMenu(makeMenu());
              }
            }
          },
          { role: "togglefullscreen" }
        ]
      },
      getHelpMenu(isMac2)
    ]);
  };
  if (!isMac2) {
    window3.setMenu(makeMenu());
  }
  window3.on("focus", () => {
    if (isMac2) {
      Menu4.setApplicationMenu(makeMenu());
    }
  });
  window3.on("blur", () => {
    if (isMac2) {
      refresh();
    }
  });
  let sandboxedView = makeBrowserView(
    account_id,
    loadRemoteContentAtStart,
    htmlEmail,
    window3
  );
  window3.contentView.addChildView(sandboxedView);
  sandboxedView.webContents.setZoomFactor(
    DesktopSettings.state.zoomFactor * Math.pow(1.2, window3.webContents.getZoomLevel())
  );
  let context_menu_handle = createContextMenu(window3, sandboxedView.webContents);
  window3.webContents.ipc.handle("html-view:more-menu", (_ev, { x, y }) => {
    const menuItems = {
      separator: () => ({ type: "separator" }),
      always_show: () => ({
        id: "always_show",
        type: "checkbox",
        label: tx("always_load_remote_images"),
        checked: DesktopSettings.state.HTMLEmailAlwaysLoadRemoteContent,
        click() {
          const newValue = !DesktopSettings.state.HTMLEmailAlwaysLoadRemoteContent;
          DesktopSettings.update({
            HTMLEmailAlwaysLoadRemoteContent: newValue
          });
          update_restrictions(null, newValue, true);
          window3.webContents.executeJavaScript(
            `document.getElementById('toggle_network').checked = window.network_enabled= ${Boolean(
              newValue
            )}`
          );
        }
      }),
      dont_ask: () => ({
        id: "show_warning",
        type: "checkbox",
        label: tx("show_warning"),
        checked: DesktopSettings.state.HTMLEmailAskForRemoteLoadingConfirmation,
        click() {
          DesktopSettings.update({
            HTMLEmailAskForRemoteLoadingConfirmation: !DesktopSettings.state.HTMLEmailAskForRemoteLoadingConfirmation
          });
        }
      })
    };
    let menu;
    if (isContactRequest) {
      menu = electron3.Menu.buildFromTemplate([menuItems.dont_ask()]);
    } else {
      menu = electron3.Menu.buildFromTemplate([
        menuItems.always_show(),
        menuItems.dont_ask()
      ]);
    }
    menu.popup({ window: window3, x, y });
  });
  window3.webContents.ipc.handle(
    "html-view:resize-content",
    (_ev, bounds) => {
      const contentZoomFactor = DesktopSettings.state.zoomFactor * Math.pow(1.2, window3.webContents.getZoomLevel());
      const windowZoomFactor = window3.webContents.getZoomFactor();
      const window_bounds = window3.getBounds();
      const content_size = window3.getContentSize();
      const new_w = bounds.width * windowZoomFactor;
      const new_h = bounds.height * windowZoomFactor;
      const new_y = content_size[1] - new_h;
      sandboxedView?.setBounds({
        x: bounds.x,
        y: new_y,
        width: new_w,
        height: new_h
      });
      sandboxedView?.webContents.setZoomFactor(contentZoomFactor);
      DesktopSettings.update({ HTMLEmailWindowBounds: window_bounds });
    }
  );
  window3.on("moved", () => {
    const window_bounds = window3.getBounds();
    DesktopSettings.update({ HTMLEmailWindowBounds: window_bounds });
  });
  const update_restrictions = async (_ev, allow_network, skip_sideeffects = false) => {
    if (!skip_sideeffects && !isContactRequest && !allow_network && DesktopSettings.state.HTMLEmailAlwaysLoadRemoteContent) {
      DesktopSettings.update({
        HTMLEmailAlwaysLoadRemoteContent: false
      });
    }
    if (!skip_sideeffects && allow_network && DesktopSettings.state.HTMLEmailAskForRemoteLoadingConfirmation) {
      const buttons = [
        {
          label: tx("no"),
          action: () => {
            throw new Error("user denied");
          }
        },
        { label: tx("yes"), action: () => {
        } }
        // isContactRequest || {
        //   label: tx('pref_html_always_load_remote_content'),
        //   action: () => {
        //     DesktopSettings.update({
        //       HTMLEmailAlwaysLoadRemoteContent: true,
        //     })
        //   },
        // },
      ].filter((item) => typeof item === "object");
      const result = await dialog.showMessageBox(window3, {
        message: tx("load_remote_content_ask"),
        buttons: buttons.map((b) => b.label),
        type: "none",
        icon: "",
        defaultId: 0,
        cancelId: 0
      });
      buttons[result.response].action();
    }
    const bounds = sandboxedView?.getBounds();
    window3.contentView.removeChildView(sandboxedView);
    context_menu_handle();
    sandboxedView.webContents.close();
    sandboxedView = makeBrowserView(
      account_id,
      allow_network,
      htmlEmail,
      window3
    );
    window3.contentView.addChildView(sandboxedView);
    context_menu_handle = createContextMenu(window3, sandboxedView.webContents);
    if (bounds)
      sandboxedView.setBounds(bounds);
  };
  window3.webContents.ipc.handle("html-view:change-network", update_restrictions);
  window3.loadFile(
    join11(
      htmlDistDir(),
      "electron_html_email_view/electron_html_email_view.html"
    )
  );
}
const CSP_DENY = `default-src 'none';
font-src 'self' data:;
frame-src 'none';
img-src 'self' data:;
media-src 'self' data:;
style-src 'self' data: 'unsafe-inline';
form-action 'none';
script-src 'none';`.replace(/\n/g, "");
const CSP_ALLOW = `
default-src 'none';
font-src 'self' data: http: https:;
frame-src 'none';
img-src 'self' blob: data: https: http:;
media-src 'self' data: http: https:;
style-src 'self' 'unsafe-inline';
form-action 'none';
script-src 'none';
`.replace(/\n/g, "");
function makeBrowserView(account_id, allow_remote_content, html_content, window3) {
  const ses = session2.fromPartition(`${Date.now()}`, { cache: false });
  ses.setProxy({ mode: "fixed_servers", proxyRules: "not-existing-proxy:80" });
  if (!allow_remote_content) {
    ses.protocol.handle("http", () => {
      return new Response("", { status: 404 });
    });
    ses.protocol.handle("https", () => {
      return new Response("", { status: 404 });
    });
  }
  ses.protocol.handle("email", () => {
    return new Response(Buffer.from(html_content), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Content-Security-Policy": allow_remote_content ? CSP_ALLOW : CSP_DENY
      }
    });
  });
  if (allow_remote_content) {
    const callback = async (req) => {
      try {
        const response = await getDCJsonrpcClient().getHttpResponse(
          account_id,
          req.url
        );
        const blob = Buffer.from(response.blob, "base64");
        return new Response(blob, {
          status: 200,
          headers: {
            "Content-Security-Policy": CSP_ALLOW,
            "Content-Type": `${response.mimetype}; ${response.encoding}`
          }
        });
      } catch (error) {
        log12.info("remote content failed to load", req.url, error);
        return new Response(Buffer.from(error?.message), {
          status: 400,
          headers: {
            mimeType: "text/plain"
          }
        });
      }
    };
    ses.protocol.handle("http", callback);
    ses.protocol.handle("https", callback);
  }
  const sandboxedView = new WebContentsView({
    webPreferences: {
      accessibleTitle: "email content",
      contextIsolation: true,
      javascript: false,
      disableDialogs: true,
      webgl: false,
      sandbox: true,
      spellcheck: false,
      session: ses
    }
  });
  sandboxedView.webContents.loadURL("email://index.html");
  sandboxedView.webContents.insertCSS(`:root {
      color: black;
      background-color: white;
    }`);
  const openLink = (url2) => {
    if (url2.startsWith("mailto:") || isInviteLink(url2)) {
      open_url(url2);
      window2?.show();
    } else {
      if (url2.startsWith("http:") || url2.startsWith("https:")) {
        shell3.openExternal(url2);
      } else {
        dialog.showMessageBox(window3, {
          buttons: [tx("no"), tx("menu_copy_link_to_clipboard")],
          message: tx("ask_copy_unopenable_link_to_clipboard", url2)
        }).then(({ response }) => {
          if (response == 1) {
            clipboard.writeText(url2);
          }
        });
      }
    }
  };
  sandboxedView.webContents.on(
    "will-navigate",
    (e, url2) => {
      e.preventDefault();
      const prefix = "email://index.html";
      if (url2.startsWith(prefix)) {
        let urlWithoutPrefix = url2.slice(prefix.length);
        if (url2.slice(prefix.length)[0] == "/") {
          urlWithoutPrefix = urlWithoutPrefix.slice(1);
        }
        if (urlWithoutPrefix.startsWith("#")) {
          const lastFragment = urlWithoutPrefix.split("#").reverse()[0];
          sandboxedView.webContents.loadURL(`email://index.html/${Math.random()}/#${lastFragment}`).catch(log12.error.bind(log12, "error"));
          return;
        } else {
          return openLink("https://" + urlWithoutPrefix);
        }
      }
      openLink(url2);
    }
  );
  sandboxedView.webContents.setWindowOpenHandler((details) => {
    openLink(details.url);
    return { action: "deny" };
  });
  return sandboxedView;
}
var createContextMenu = (win2, webContents2) => {
  const handleContextMenu = (_event, props) => {
    const { editFlags } = props;
    const hasText = props.selectionText.trim().length > 0;
    const menuItems = [];
    if (props.isEditable || hasText) {
      menuItems.push(
        new MenuItem({
          id: "copy",
          label: tx("global_menu_edit_copy_desktop"),
          enabled: editFlags.canCopy && hasText,
          click() {
            if (webContents2) {
              webContents2.copy();
            } else {
              electron3.clipboard.writeText(props.selectionText);
            }
          }
        })
      );
    }
    if (props.mediaType === "image") {
      if (menuItems.length) {
        menuItems.push(new MenuItem({ type: "separator" }));
      }
      menuItems.push(
        new MenuItem({
          id: "copyImage",
          label: tx("menu_copy_image_to_clipboard"),
          click() {
            webContents2.copyImageAt(props.x, props.y);
          }
        })
      );
    }
    if (props.linkURL.length !== 0 && props.mediaType === "none") {
      if (menuItems.length) {
        menuItems.push(new MenuItem({ type: "separator" }));
      }
      menuItems.push(
        new MenuItem({
          id: "copyLink",
          label: tx("menu_copy_link_to_clipboard"),
          click() {
            electron3.clipboard.write({
              bookmark: props.linkText,
              text: props.linkURL
            });
          }
        })
      );
    }
    if (menuItems.length) {
      const menu = electron3.Menu.buildFromTemplate(menuItems);
      menu.popup({ window: win2 });
    }
  };
  webContents2.on("context-menu", handleContextMenu);
  return () => {
    if (win2.isDestroyed()) {
      return;
    }
    webContents2.removeListener("context-menu", handleContextMenu);
  };
};

// src/deltachat/controller.ts
init_cjs_shim();

// src/deltachat/webxdc.ts
init_cjs_shim();
import {
  app as app6,
  BrowserWindow as BrowserWindow8,
  protocol,
  ipcMain as ipcMain4,
  session as session3,
  screen as screen3
} from "electron/main";
import Mime from "mime-types";
import {
  Menu as Menu5,
  nativeImage as nativeImage2,
  shell as shell4,
  dialog as dialog2,
  clipboard as clipboard2
} from "electron";
import { join as join12, dirname as dirname4 } from "path";
import { fileURLToPath as fileURLToPath5 } from "url";
import { platform as platform7 } from "os";
import { readdir as readdir3, stat as stat2, rmdir, writeFile, readFile as readFile4 } from "fs/promises";
import { existsSync as existsSync4 } from "fs";
const __dirname4 = dirname4(fileURLToPath5(import.meta.url));
const log13 = getLogger("main/deltachat/webxdc");
const open_apps = {};
const accounts_sessions = [];
const CSP = "default-src 'self';  style-src 'self' 'unsafe-inline' blob: ;  font-src 'self' data: blob: ;  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: ;  connect-src 'self' data: blob: ;  img-src 'self' data: blob: ;  media-src 'self' data: blob: ;  webrtc 'block'";
const ALLOWED_PERMISSIONS = [
  // Games might lock the pointer
  "pointerLock",
  // Games might do that too
  "fullscreen"
];
const WRAPPER_PATH = "webxdc-wrapper.45870014933640136498.html";
const BOUNDS_UI_CONFIG_PREFIX = "ui.desktop.webxdcBounds";
const DEFAULT_SIZE_WEBXDC = {
  width: 375,
  height: 667
};
const DEFAULT_SIZE_MAP = {
  width: 1e3,
  height: 800
};
const DCWebxdc = class {
  constructor(controller) {
    this.controller = controller;
    app6.whenReady().then(() => {
      protocol.handle("webxdc-icon", async (request) => {
        const [a, m] = request.url.substring(12).split(".");
        const [accountId, messageId] = [Number(a), Number(m)];
        try {
          const { icon } = await this.rpc.getWebxdcInfo(accountId, messageId);
          const blob = Buffer.from(
            await this.rpc.getWebxdcBlob(accountId, messageId, icon),
            "base64"
          );
          return new Response(blob, {
            headers: { "content-type": Mime.lookup(icon) || "" }
          });
        } catch (error) {
          log13.error("failed to load webxdc icon for:", error);
          return new Response("", { status: 404 });
        }
      });
    });
    const openWebxdc = async (_ev, msg_id, p, defaultSize = DEFAULT_SIZE_WEBXDC) => {
      const { webxdcInfo, chatName, accountId, href } = p;
      let base64EncodedHref = "";
      const appURL = `webxdc://${accountId}.${msg_id}.webxdc`;
      if (href && href !== "") {
        const url2 = new URL(href, "http://dummy");
        const relativeUrl = url2.pathname + url2.search + url2.hash;
        base64EncodedHref = Buffer.from(appURL + relativeUrl).toString("base64");
      }
      if (open_apps[`${accountId}.${msg_id}`]) {
        log13.warn(
          "webxdc instance for this app is already open, trying to focus it",
          { msg_id }
        );
        const window3 = open_apps[`${accountId}.${msg_id}`].win;
        if (window3.isMinimized()) {
          window3.restore();
        }
        if (base64EncodedHref !== "") {
          window3.webContents.executeJavaScript(
            `window.webxdc_internal.setLocationUrl("${base64EncodedHref}")`
          );
        }
        window3.focus();
        return;
      }
      log13.info("opening new webxdc instance", { msg_id });
      const icon = webxdcInfo.icon;
      const icon_blob = Buffer.from(
        await this.rpc.getWebxdcBlob(accountId, msg_id, icon),
        "base64"
      );
      if (!accounts_sessions.includes(accountId)) {
        const ses = sessionFromAccountId(accountId);
        accounts_sessions.push(accountId);
        ses.protocol.handle(
          "webxdc",
          (...args) => webxdcProtocolHandler(this.rpc, ...args)
        );
      }
      const app_icon = icon_blob && nativeImage2?.createFromBuffer(icon_blob);
      const webxdcWindow = new BrowserWindow8({
        webPreferences: {
          partition: partitionFromAccountId(accountId),
          sandbox: true,
          contextIsolation: true,
          webSecurity: true,
          nodeIntegration: false,
          navigateOnDragDrop: false,
          devTools: DesktopSettings.state.enableWebxdcDevTools,
          javascript: true,
          preload: join12(htmlDistDir(), "webxdc-preload.js")
        },
        title: makeTitle(webxdcInfo, chatName),
        icon: app_icon || void 0,
        alwaysOnTop: window2?.isAlwaysOnTop(),
        show: false
      });
      setContentProtection(webxdcWindow);
      const lastBounds = await this.getLastBounds(
        accountId,
        msg_id
      );
      const size = adjustSize(lastBounds || defaultSize);
      const bounds = { ...lastBounds || {}, ...size };
      webxdcWindow.setBounds(bounds, true);
      webxdcWindow.show();
      open_apps[`${accountId}.${msg_id}`] = {
        win: webxdcWindow,
        accountId,
        msgId: msg_id,
        internet_access: webxdcInfo["internetAccess"],
        selfAddr: webxdcInfo.selfAddr || "unknown@unknown",
        displayName: p.displayname || webxdcInfo.selfAddr || "unknown",
        sendUpdateInterval: webxdcInfo.sendUpdateInterval,
        sendUpdateMaxSize: webxdcInfo.sendUpdateMaxSize
      };
      const isMac2 = platform7() === "darwin";
      const makeMenu = () => {
        return Menu5.buildFromTemplate([
          ...isMac2 ? [getAppMenu(webxdcWindow)] : [],
          getFileMenu(webxdcWindow, isMac2),
          getEditMenu(),
          {
            label: tx("global_menu_view_desktop"),
            submenu: [
              ...DesktopSettings.state.enableWebxdcDevTools ? [
                {
                  label: tx("global_menu_view_developer_tools_desktop"),
                  role: "toggleDevTools"
                }
              ] : [],
              { type: "separator" },
              { role: "resetZoom" },
              { role: "zoomIn" },
              { role: "zoomOut" },
              { type: "separator" },
              {
                label: tx("global_menu_view_floatontop_desktop"),
                type: "checkbox",
                checked: webxdcWindow.isAlwaysOnTop(),
                click: () => {
                  webxdcWindow.setAlwaysOnTop(!webxdcWindow.isAlwaysOnTop());
                  if (platform7() !== "darwin") {
                    webxdcWindow.setMenu(makeMenu());
                  } else {
                    Menu5.setApplicationMenu(makeMenu());
                  }
                }
              },
              { role: "togglefullscreen" }
            ]
          },
          {
            label: tx("menu_help"),
            submenu: [
              {
                label: tx("source_code"),
                enabled: !!webxdcInfo.sourceCodeUrl,
                icon: app_icon?.resize({ width: 24 }) || void 0,
                click: () => {
                  if (webxdcInfo.sourceCodeUrl?.startsWith("https:") || webxdcInfo.sourceCodeUrl?.startsWith("http:")) {
                    shell4.openExternal(webxdcInfo.sourceCodeUrl);
                  } else if (webxdcInfo.sourceCodeUrl) {
                    const url2 = webxdcInfo.sourceCodeUrl;
                    dialog2.showMessageBox(webxdcWindow, {
                      buttons: [tx("no"), tx("menu_copy_link_to_clipboard")],
                      message: tx(
                        "ask_copy_unopenable_link_to_clipboard",
                        url2
                      )
                    }).then(({ response }) => {
                      if (response == 1) {
                        clipboard2.writeText(url2);
                      }
                    });
                  }
                }
              },
              {
                type: "separator"
              },
              {
                label: tx("what_is_webxdc"),
                click: () => shell4.openExternal("https://webxdc.org")
              }
            ]
          }
        ]);
      };
      if (!isMac2) {
        webxdcWindow.setMenu(makeMenu());
      }
      webxdcWindow.on("focus", () => {
        if (isMac2) {
          Menu5.setApplicationMenu(makeMenu());
        }
      });
      webxdcWindow.on("blur", () => {
        if (isMac2) {
          refresh();
        }
      });
      webxdcWindow.once("closed", () => {
        delete open_apps[`${accountId}.${msg_id}`];
      });
      webxdcWindow.once("close", () => {
        const lastBounds2 = webxdcWindow.getBounds();
        this.setLastBounds(accountId, msg_id, lastBounds2);
      });
      webxdcWindow.once("ready-to-show", () => {
        if (base64EncodedHref !== "") {
          webxdcWindow.webContents.executeJavaScript(
            `window.webxdc_internal.setLocationUrl("${base64EncodedHref}")`
          );
        }
      });
      webxdcWindow.webContents.loadURL(appURL + "/" + WRAPPER_PATH, {
        extraHeaders: "Content-Security-Policy: " + CSP
      });
      webxdcWindow.webContents.on("will-navigate", (ev) => {
        ev.preventDefault();
      });
      let denyPreventUnload = false;
      webxdcWindow.webContents.on("will-prevent-unload", (ev) => {
        if (denyPreventUnload) {
          ev.preventDefault();
        }
        setTimeout(() => {
          if (webxdcWindow.isDestroyed()) {
            return;
          }
          const choice = dialog2.showMessageBoxSync(webxdcWindow, {
            type: "question",
            // Chromium shows "Close" and "Cancel",
            // Gecko (Firefox) shows "Leave page" and "Stay on page".
            buttons: [tx("close_window"), tx("cancel")],
            title: tx("webxdc_beforeunload_dialog_title"),
            message: tx("webxdc_beforeunload_dialog_message"),
            defaultId: 0,
            cancelId: 1
          });
          const close = choice === 0;
          if (close) {
            denyPreventUnload = true;
            webxdcWindow.close();
          }
        }, 150);
      });
      webxdcWindow.on("page-title-updated", (ev) => {
        ev.preventDefault();
      });
      const loggedPermissionRequests = /* @__PURE__ */ new Set();
      const permission_handler = (permission) => {
        const isAllowed = ALLOWED_PERMISSIONS.includes(permission);
        if (!loggedPermissionRequests.has(permission)) {
          loggedPermissionRequests.add(permission);
          if (isAllowed) {
            log13.info(
              `ALLOWED permission '${permission}' to webxdc '${webxdcInfo.name}'`
            );
          } else {
            log13.info(
              `DENIED permission '${permission}' to webxdc '${webxdcInfo.name}'. If you think that's a bug and you need that permission, then please open an issue on github.`
            );
          }
        }
        return isAllowed;
      };
      webxdcWindow.webContents.session.setPermissionCheckHandler(
        (_wc, permission) => {
          return permission_handler(permission);
        }
      );
      webxdcWindow.webContents.session.setPermissionRequestHandler(
        (_wc, permission, callback) => {
          callback(permission_handler(permission));
        }
      );
      webxdcWindow.webContents.on("before-input-event", (event, input) => {
        if (input.code === "F12") {
          if (DesktopSettings.state.enableWebxdcDevTools) {
            webxdcWindow.webContents.toggleDevTools();
            event.preventDefault();
          }
        }
      });
    };
    ipcMain4.handle("open-webxdc", openWebxdc);
    ipcMain4.handle("webxdc.exitFullscreen", async (event) => {
      const app13 = lookupAppFromEvent(event);
      if (app13 && app13.win.isFullScreen()) {
        app13.win.setFullScreen(false);
      }
    });
    ipcMain4.handle("webxdc.exit", async (event) => {
      const app13 = lookupAppFromEvent(event);
      if (app13) {
        app13.win.loadURL("about:blank");
        app13.win.close();
      }
    });
    ipcMain4.handle("webxdc.getAllUpdates", async (event, serial = 0) => {
      const app13 = lookupAppFromEvent(event);
      if (!app13) {
        log13.error(
          "webxdc.getAllUpdates failed, app not found in list of open ones"
        );
        return [];
      }
      return await this.rpc.getWebxdcStatusUpdates(
        app13.accountId,
        app13.msgId,
        serial
      );
    });
    ipcMain4.handle("webxdc.sendUpdate", async (event, update) => {
      const app13 = lookupAppFromEvent(event);
      if (!app13) {
        log13.error(
          "webxdc.sendUpdate failed, app not found in list of open ones"
        );
        return;
      }
      try {
        return await this.rpc.sendWebxdcStatusUpdate(
          app13.accountId,
          app13.msgId,
          update,
          ""
        );
      } catch (error) {
        log13.error("webxdc.sendUpdate failed:", error);
        throw error;
      }
    });
    ipcMain4.handle(
      "webxdc.sendRealtimeData",
      async (event, update) => {
        const app13 = lookupAppFromEvent(event);
        if (!app13) {
          log13.error(
            "webxdc.sendRealtimeData failed, app not found in list of open ones"
          );
          return;
        }
        try {
          return await this.rpc.sendWebxdcRealtimeData(
            app13.accountId,
            app13.msgId,
            update
          );
        } catch (error) {
          log13.error("webxdc.sendWebxdcRealtimeData failed:", error);
          throw error;
        }
      }
    );
    ipcMain4.handle("webxdc.sendRealtimeAdvertisement", async (event) => {
      const app13 = lookupAppFromEvent(event);
      if (!app13) {
        log13.error(
          "webxdc.sendRealtimeAdvertisement failed, app not found in list of open ones"
        );
        return;
      }
      await this.rpc.sendWebxdcRealtimeAdvertisement(app13.accountId, app13.msgId);
    });
    ipcMain4.handle("webxdc.leaveRealtimeChannel", async (event) => {
      const app13 = lookupAppFromEvent(event);
      if (!app13) {
        log13.error(
          "webxdc.leaveRealtimeChannel, app not found in list of open ones"
        );
        return;
      }
      this.rpc.leaveWebxdcRealtime(app13.accountId, app13.msgId);
    });
    ipcMain4.handle(
      "webxdc.sendToChat",
      (event, file, text) => {
        const app13 = lookupAppFromEvent(event);
        if (!app13) {
          log13.error(
            "webxdc.sendToChat failed, app not found in list of open ones"
          );
          return;
        }
        window2?.webContents.send(
          "webxdc.sendToChat",
          file,
          text,
          app13.accountId
        );
        window2?.focus();
      }
    );
    ipcMain4.handle("close-all-webxdc", () => {
      this._closeAll();
    });
    ipcMain4.handle(
      "webxdc:custom:drag-file-out",
      async (event, file_name, base64_content, icon_data_url) => {
        const path4 = await writeTempFileFromBase64(file_name, base64_content);
        let icon = join12(
          htmlDistDir(),
          "images/electron-file-drag-out.png"
        );
        if (icon_data_url) {
          icon = nativeImage2.createFromDataURL(icon_data_url);
        }
        event.sender.startDrag({
          file: path4,
          icon
        });
      }
    );
    ipcMain4.handle(
      "webxdc:status-update",
      (_ev, accountId, instanceId) => {
        const instance = open_apps[`${accountId}.${instanceId}`];
        if (instance) {
          instance.win.webContents.send("webxdc.statusUpdate");
        }
      }
    );
    ipcMain4.handle(
      "webxdc:realtime-data",
      async (_ev, accountId, instanceId, payload) => {
        const instance = open_apps[`${accountId}.${instanceId}`];
        if (instance) {
          instance.win.webContents.send("webxdc.realtimeData", payload);
        } else {
          this.rpc.leaveWebxdcRealtime(accountId, instanceId);
        }
      }
    );
    ipcMain4.handle(
      "webxdc:message-changed",
      async (_ev, accountId, instanceId) => {
        const instance = open_apps[`${accountId}.${instanceId}`];
        if (instance) {
          const { chatId, webxdcInfo } = await this.rpc.getMessage(
            accountId,
            instanceId
          );
          const { name } = await this.rpc.getBasicChatInfo(accountId, chatId);
          if (instance.win && webxdcInfo) {
            instance.win.title = makeTitle(webxdcInfo, name);
          }
        }
      }
    );
    ipcMain4.handle(
      "webxdc:instance-deleted",
      (_ev, accountId, instanceId) => {
        const webxdcId = `${accountId}.${instanceId}`;
        const instance = open_apps[webxdcId];
        if (instance) {
          instance.win.close();
        }
        this.removeLastBounds(accountId, instanceId);
        const s = sessionFromAccountId(accountId);
        const appURL = `webxdc://${webxdcId}.webxdc`;
        s.clearStorageData({ origin: appURL });
        s.clearData({ origins: [appURL] });
        s.clearCodeCaches({ urls: [appURL] });
        s.clearCache();
      }
    );
    ipcMain4.handle(
      "open-maps-webxdc",
      async (evt, accountId, chatId) => {
        let msgId = await this.rpc.initWebxdcIntegration(
          accountId,
          chatId ?? null
        );
        if (!msgId) {
          const path4 = htmlDistDir().replace("app.asar", "app.asar.unpacked");
          await this.rpc.setWebxdcIntegration(
            accountId,
            join12(path4, "/xdcs/maps.xdc")
          );
          msgId = await this.rpc.initWebxdcIntegration(
            accountId,
            chatId ?? null
          );
        }
        if (msgId) {
          let chatName = tx("menu_show_global_map");
          if (chatId) {
            const relatedChatInfo = await this.rpc.getBasicChatInfo(
              accountId,
              chatId
            );
            chatName = tx("locations") + " - " + relatedChatInfo.name;
          } else {
            const accountInfo = await this.rpc.getAccountInfo(accountId);
            if ("displayName" in accountInfo && accountInfo.displayName !== null) {
              chatName = tx("menu_show_global_map") + " - " + accountInfo.displayName;
            }
          }
          const key = `${accountId}.${msgId}`;
          if (open_apps[key] !== void 0) {
            open_apps[key].win.loadURL("about:blank");
            open_apps[key].win.close();
          }
          const messageWithMap = await this.rpc.getMessage(accountId, msgId);
          if (messageWithMap && messageWithMap.webxdcInfo) {
            openWebxdc(
              evt,
              msgId,
              {
                accountId,
                displayname: "",
                chatName,
                webxdcInfo: messageWithMap.webxdcInfo,
                href: ""
              },
              // special behaviour for the map dc integration,
              // (in this case bigger landscape window)
              DEFAULT_SIZE_MAP
            );
          }
        }
      }
    );
  }
  // end of DeltaChatController constructor
  get rpc() {
    return this.controller.jsonrpcRemote.rpc;
  }
  async getLastBounds(accountId, msgId) {
    try {
      const raw = await this.rpc.getConfig(
        accountId,
        `${BOUNDS_UI_CONFIG_PREFIX}.${msgId}`
      );
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (error) {
      log13.debug("failed to retrieve bounds for webxdc", error);
    }
    return null;
  }
  setLastBounds(accountId, msgId, bounds) {
    return this.rpc.setConfig(
      accountId,
      `${BOUNDS_UI_CONFIG_PREFIX}.${msgId}`,
      JSON.stringify(bounds)
    );
  }
  removeLastBounds(accountId, msgId) {
    return this.rpc.setConfig(
      accountId,
      `${BOUNDS_UI_CONFIG_PREFIX}.${msgId}`,
      null
    );
  }
  _closeAll() {
    for (const open_app of Object.keys(open_apps)) {
      open_apps[open_app].win.close();
    }
  }
};
async function webxdcProtocolHandler(rpc, request) {
  const makeResponse = (body, responseInit, mime_type) => {
    const headers = new Headers();
    if (!open_apps[id].internet_access) {
      headers.append("Content-Security-Policy", CSP);
    }
    headers.append("X-Content-Type-Options", "nosniff");
    if (mime_type) {
      headers.append("content-type", mime_type);
    }
    return new Response(body, {
      ...responseInit,
      headers
    });
  };
  const url2 = new URL(request.url);
  const [account, msg] = url2.hostname.split(".");
  const id = `${account}.${msg}`;
  if (!open_apps[id]) {
    return makeResponse("", { status: 500 });
  }
  let filename = url2.pathname;
  if (filename.endsWith("/")) {
    filename = filename.substring(0, filename.length - 1);
  }
  if (filename.startsWith("/")) {
    filename = filename.substring(1);
  }
  let mimeType = Mime.lookup(filename) || "";
  if (mimeType === "application/pdf") {
    mimeType = void 0;
  }
  if (filename === WRAPPER_PATH) {
    return makeResponse(
      await readFile4(join12(htmlDistDir(), "/webxdc_wrapper.html")),
      {},
      mimeType
    );
  } else if (filename === "webxdc.js") {
    const displayName = Buffer.from(open_apps[id].displayName).toString(
      "base64"
    );
    const selfAddr = Buffer.from(open_apps[id].selfAddr).toString("base64");
    return makeResponse(
      Buffer.from(
        `window.parent.webxdc_internal.setup("${selfAddr}","${displayName}", ${Number(
          open_apps[id].sendUpdateInterval
        )}, ${Number(open_apps[id].sendUpdateMaxSize)})
        window.webxdc = window.parent.webxdc
        window.webxdc_custom = window.parent.webxdc_custom`
      ),
      {},
      mimeType
    );
  } else {
    try {
      const blob = Buffer.from(
        await rpc.getWebxdcBlob(
          open_apps[id].accountId,
          open_apps[id].msgId,
          filename
        ),
        "base64"
      );
      return makeResponse(blob, {}, mimeType);
    } catch (error) {
      log13.error("webxdc: load blob:", error);
      return makeResponse("", { status: 404 });
    }
  }
}
function lookupAppFromEvent(event) {
  for (const key of Object.keys(open_apps)) {
    const app13 = open_apps[key];
    if (app13.win.webContents === event.sender) {
      return app13;
    }
  }
  return null;
}
function makeTitle(webxdcInfo, chatName) {
  return `${webxdcInfo.document ? truncateText(webxdcInfo.document, 32) + " - " : ""}${truncateText(webxdcInfo.name, 42)} \u2013 ${chatName}`;
}
function partitionFromAccountId(accountId) {
  return `persist:webxdc_${accountId}`;
}
function sessionFromAccountId(accountId) {
  return session3.fromPartition(partitionFromAccountId(accountId), {
    cache: false
  });
}
ipcMain4.handle("webxdc.clearWebxdcDOMStorage", async (_, accountId) => {
  const session4 = sessionFromAccountId(accountId);
  await session4.clearStorageData();
  await session4.clearData();
});
ipcMain4.handle("webxdc.getWebxdcDiskUsage", async (_, accountId) => {
  const ses = sessionFromAccountId(accountId);
  if (!ses.storagePath) {
    throw new Error("session has no storagePath set");
  }
  const [cache_size, real_total_size] = await Promise.all([
    ses.getCacheSize(),
    get_recursive_folder_size(ses.storagePath, [
      "GPUCache",
      "QuotaManager",
      "Code Cache",
      "LOG",
      "LOG.old",
      "LOCK",
      ".DS_Store",
      "Cookies-journal",
      "Databases.db-journal",
      "Preferences",
      "QuotaManager-journal",
      "000003.log",
      "MANIFEST-000001"
    ])
  ]);
  const empty_size = 49 * 1024;
  let total_size = real_total_size - empty_size;
  let data_size = total_size - cache_size;
  if (total_size < 0) {
    total_size = 0;
    data_size = 0;
  }
  return {
    cache_size,
    total_size,
    data_size
  };
});
async function get_recursive_folder_size(path4, exclude_list = []) {
  let size = 0;
  for (const item of await readdir3(path4)) {
    const item_path = join12(path4, item);
    const stats = await stat2(item_path);
    if (exclude_list.includes(item)) {
      continue;
    }
    if (stats.isDirectory()) {
      size += await get_recursive_folder_size(item_path, exclude_list);
    } else {
      size += stats.size;
    }
  }
  return size;
}
async function webxdcStartUpCleanup() {
  try {
    const partitions_dir = join12(getConfigPath(), "Partitions");
    if (!existsSync4(partitions_dir)) {
      return;
    }
    const folders = await readdir3(partitions_dir);
    for (const folder of folders) {
      if (!folder.startsWith("webxdc")) {
        continue;
      }
      try {
        await stat2(join12(partitions_dir, folder, "webxdc-cleanup"));
        await rmdir(join12(partitions_dir, folder), { recursive: true });
        log13.info("webxdc cleanup: deleted ", folder);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }
  } catch (error) {
    log13.warn("webxdc cleanup failed", error);
  }
}
function adjustSize(size) {
  const { height: screenHeight, width: screenWidth } = screen3.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.min(size.width, screenWidth),
    height: Math.min(size.height, screenHeight)
  };
}
ipcMain4.handle("delete_webxdc_account_data", async (_ev, accountId) => {
  const s = session3.fromPartition(`persist:webxdc_${accountId}`, {
    cache: false
  });
  await s.clearStorageData();
  await s.clearData();
  if (s.storagePath) {
    await writeFile(join12(s.storagePath, "webxdc-cleanup"), "-", "utf-8");
  } else {
    throw new Error("session has no storagePath set");
  }
});

// src/deltachat/stdio_server.ts
init_cjs_shim();

// src/get-build-info.ts
init_cjs_shim();
const BuildInfo = JSON.parse('{"VERSION":"1.58.2","BUILD_TIMESTAMP":1748600552939,"GIT_REF":"v1.48.0-670-g896ac3964"}');

// src/deltachat/stdio_server.ts
import { spawn } from "child_process";
import { app as app7, dialog as dialog3 } from "electron/main";
import { arch, platform as platform8 } from "os";
const log14 = getLogger("DC-RPC");
const StdioServer = class {
  constructor(on_data, accounts_path, cmd_path) {
    this.on_data = on_data;
    this.accounts_path = accounts_path;
    this.cmd_path = cmd_path;
    this.serverProcess = null;
  }
  serverProcess;
  start() {
    this.serverProcess = spawn(this.cmd_path, {
      env: {
        DC_ACCOUNTS_PATH: this.accounts_path,
        RUST_LOG: process.env.RUST_LOG,
        // remove color from errors, see https://github.com/deltachat/deltachat-desktop/issues/4832
        NO_COLOR: "1"
      }
    });
    this.serverProcess.on("error", (err) => {
      if (err.message.endsWith("ENOENT")) {
        dialog3.showErrorBox(
          "Fatal Error: Core Library Missing",
          `The DeltaChat Module is missing! This could be due to your antivirus program. Please check the quarantine to restore it and notify the developers about this issue.
You can reach us on delta@merlinux.eu or on github.com/deltachat/deltachat-desktop/issues.

The missing module should be located at "${this.cmd_path}".

The Log file is located in this folder: ${getLogsPath()}
--------------------
Error: ${err.message}
`
        );
      } else {
        dialog3.showErrorBox(
          "Fatal Error",
          `Error with core has been detected, please contact developers: You can reach us on delta@merlinux.eu or on github.com/deltachat/deltachat-desktop/issues .

          ${err.name}: ${err.message}

          The Log file is located in this folder: ${getLogsPath()}

          `
        );
      }
      app7.exit(1);
    });
    let buffer = "";
    this.serverProcess.stdout.on("data", (data) => {
      buffer += data.toString();
      while (buffer.includes("\n")) {
        const n = buffer.indexOf("\n");
        const message = buffer.substring(0, n);
        this.on_data(message);
        buffer = buffer.substring(n + 1);
      }
    });
    let errorLog = "";
    const ERROR_LOG_LENGTH = 800;
    this.serverProcess.stderr.on("data", (data) => {
      log14.error(`stderr: ${data}`.trimEnd());
      errorLog = (errorLog + data).slice(-ERROR_LOG_LENGTH);
    });
    this.serverProcess.on("close", (code, signal) => {
      if (code !== null) {
        log14.info(`child process close all stdio with code ${code}`);
      } else {
        log14.info(`child process close all stdio with signal ${signal}`);
      }
    });
    this.serverProcess.on("exit", (code, signal) => {
      if (code !== null) {
        log14.info(`child process exited with code ${code}`);
        if (code !== 0) {
          log14.critical("Fatal: The Delta Chat Core exited unexpectedly", code);
          dialog3.showErrorBox(
            "Fatal Error",
            `[Version: ${BuildInfo.VERSION} | ${platform8()} | ${arch()}]
The Delta Chat Core exited unexpectedly with code ${code}
${errorLog}`
          );
          app7.exit(1);
        }
      } else {
        log14.warn(`child process exited with signal ${signal}`);
      }
    });
  }
  send(message) {
    this.serverProcess?.stdin.write(message + "\n");
  }
};

// src/deltachat/migration.ts
init_cjs_shim();
import { startDeltaChat } from "@deltachat/stdio-rpc-server";
import { existsSync as existsSync5, lstatSync } from "fs";
import { join as join13 } from "path";
import { mkdir, readdir as readdir4, rename, rm, rmdir as rmdir2, stat as stat3 } from "fs/promises";
async function migrateAccountsIfNeeded(cwd, log20, treatFailedMigrationAsError = false) {
  let tmpDC;
  const eventLogger = (accountId, event) => log20.debug("core-event", { accountId, ...event });
  try {
    const new_accounts_format = existsSync5(join13(cwd, "accounts.toml"));
    if (new_accounts_format) {
      log20.debug("migration not needed: accounts.toml already exists");
      return false;
    }
    log20.debug("accounts.toml not found, checking if there is previous data");
    const configPath = join13(cwd, "..");
    const accountFoldersFormat1 = (await readdir4(configPath)).filter(
      (folderName) => {
        const path4 = join13(configPath, folderName);
        try {
          const db_path = join13(path4, "db.sqlite");
          return lstatSync(path4).isDirectory() && existsSync5(db_path) && lstatSync(db_path).isFile() && !lstatSync(path4).isSymbolicLink();
        } catch (error) {
          log20.debug("error while testing if folder is account", error);
          return false;
        }
      }
    );
    const migrateFromFormat1 = accountFoldersFormat1.length !== 0;
    const migrateFromFormat2 = existsSync5(cwd);
    if (!migrateFromFormat1 && !migrateFromFormat2) {
      log20.info("migration not needed: nothing to migrate");
      return false;
    }
    const path_accounts = join13(cwd, "..", "accounts");
    const pathAccountsOld = join13(cwd, "..", "accounts_old");
    if (migrateFromFormat2) {
      log20.info(`found old some accounts (format 2), we need to migrate...`);
      await rename(path_accounts, pathAccountsOld);
    }
    tmpDC = await startDeltaChat(path_accounts, {
      muteStdErr: false
    });
    tmpDC.on("ALL", eventLogger);
    const oldFoldersToDelete = [];
    if (migrateFromFormat1) {
      log20.info(
        `found old ${accountFoldersFormat1.length} legacy accounts (1), we need to migrate...`
      );
      for (const folder of accountFoldersFormat1) {
        log20.debug(`migrating legacy account "${folder}"`);
        const pathDBFile = join13(configPath, folder, "db.sqlite");
        const blobsFolder = join13(configPath, folder, "db.sqlite-blobs");
        if (!existsSync5(blobsFolder)) {
          await mkdir(blobsFolder, { recursive: true });
        }
        try {
          await tmpDC.rpc.migrateAccount(pathDBFile);
          oldFoldersToDelete.push(folder);
        } catch (error) {
          log20.error(`Failed to migrate account at path "${pathDBFile}"`, error);
          if (treatFailedMigrationAsError) {
            throw error;
          }
        }
      }
    }
    if (migrateFromFormat2) {
      for (const entry of await readdir4(pathAccountsOld)) {
        const stat_result = await stat3(join13(pathAccountsOld, entry));
        if (!stat_result.isDirectory())
          continue;
        log20.debug(`migrating account "${join13(pathAccountsOld, entry)}"`);
        const path_dbfile = join13(pathAccountsOld, entry, "db.sqlite");
        if (!existsSync5(path_dbfile)) {
          log20.warn(
            "found an old accounts folder without a db.sqlite file, skipping"
          );
          continue;
        }
        const blobsFolder = join13(pathAccountsOld, entry, "db.sqlite-blobs");
        if (!existsSync5(blobsFolder)) {
          await mkdir(blobsFolder, { recursive: true });
        }
        try {
          const account_id = await tmpDC.rpc.migrateAccount(path_dbfile);
          const old_sticker_folder = join13(pathAccountsOld, entry, "stickers");
          if (existsSync5(old_sticker_folder)) {
            log20.debug("found stickers, migrating them", old_sticker_folder);
            try {
              const blobdir = await tmpDC.rpc.getBlobDir(account_id);
              if (!blobdir) {
                throw new Error("blobdir is undefined");
              }
              const new_sticker_folder = join13(blobdir, "../stickers");
              await rename(old_sticker_folder, new_sticker_folder);
            } catch (error) {
              log20.error("stickers migration failed", old_sticker_folder, error);
              if (treatFailedMigrationAsError) {
                throw error;
              }
            }
          }
          oldFoldersToDelete.push(join13(pathAccountsOld, entry));
        } catch (error) {
          log20.error(
            `Failed to migrate account at path "${path_dbfile}":`,
            error
          );
        }
      }
    }
    tmpDC.off("ALL", eventLogger);
    tmpDC.close();
    for (const oldFolder of oldFoldersToDelete.map((f) => join13(configPath, f))) {
      try {
        try {
          await rm(join13(oldFolder, ".DS_Store"));
        } catch (error) {
        }
        await rmdir2(oldFolder);
      } catch (error) {
        log20.error("Failed to cleanup old folder:", oldFolder, error);
      }
    }
    log20.info("migration completed");
    return true;
  } catch (err) {
    tmpDC?.off("ALL", eventLogger);
    tmpDC?.close();
    throw err;
  }
}

// src/deltachat/controller.ts
import { app as rawApp4, ipcMain as ipcMain5 } from "electron";
import { EventEmitter as EventEmitter2 } from "events";
import { yerpc, BaseDeltaChat } from "@deltachat/jsonrpc-client";
import { getRPCServerPath } from "@deltachat/stdio-rpc-server";
const app8 = rawApp4;
const log15 = getLogger("main/deltachat");
const logCoreEvent = getLogger("core/event");
const ElectronMainTransport = class extends yerpc.BaseTransport {
  constructor(sender) {
    super();
    this.sender = sender;
  }
  onMessage(message) {
    this._onmessage(message);
  }
  _send(message) {
    this.sender(message);
  }
};
const JRPCDeltaChat = class extends BaseDeltaChat {
};
const DeltaChatController = class extends EventEmitter2 {
  constructor(cwd) {
    super();
    this.cwd = cwd;
  }
  /**
   * Created and owned by ipc on the backend
   */
  _inner_account_manager = null;
  get account_manager() {
    if (!this._inner_account_manager) {
      throw new Error("account manager is not defined (yet?)");
    }
    return this._inner_account_manager;
  }
  /** for runtime info */
  rpcServerPath;
  _jsonrpcRemote = null;
  get jsonrpcRemote() {
    if (!this._jsonrpcRemote) {
      throw new Error("_jsonrpcRemote is not defined (yet?)");
    }
    return this._jsonrpcRemote;
  }
  async init() {
    log15.debug("Check if legacy accounts need migration");
    if (await migrateAccountsIfNeeded(this.cwd, getLogger("migration"))) {
      DesktopSettings.update({
        lastAccount: void 0,
        lastChats: {},
        lastSaveDialogLocation: void 0
      });
    }
    log15.debug("Initiating DeltaChatNode");
    let serverPath = await getRPCServerPath({
      // desktop should only use prebuilds normally
      disableEnvPath: !rc_default["allow-unsafe-core-replacement"]
    });
    if (serverPath.includes("app.asar")) {
      serverPath = serverPath.replace("app.asar", "app.asar.unpacked");
    }
    this.rpcServerPath = serverPath;
    log15.info("using deltachat-rpc-server at", { serverPath });
    this._inner_account_manager = new StdioServer(
      (response) => {
        try {
          if (response.indexOf('"id":"main-') !== -1) {
            const message = JSON.parse(response);
            if (message.id.startsWith("main-")) {
              message.id = Number(message.id.replace("main-", ""));
              mainProcessTransport.onMessage(message);
              return;
            }
          }
        } catch (error) {
          log15.error("jsonrpc-decode", error);
        }
        send("json-rpc-message", response);
        if (response.indexOf("event") !== -1)
          try {
            const { result } = JSON.parse(response);
            const { contextId, event } = result;
            if (contextId !== void 0 && typeof event === "object" && event.kind) {
              if (event.kind === "WebxdcRealtimeData") {
                return;
              }
              if (event.kind === "Warning") {
                logCoreEvent.warn(contextId, event.msg);
              } else if (event.kind === "Info") {
                logCoreEvent.info(contextId, event.msg);
              } else if (event.kind.startsWith("Error")) {
                logCoreEvent.error(contextId, event.msg);
              } else if (app8.rc["log-debug"]) {
                const event_clone = Object.assign({}, event);
                delete event_clone.kind;
                logCoreEvent.debug(contextId, event.kind, event);
              }
            }
          } catch (error) {
            return;
          }
      },
      this.cwd,
      serverPath
    );
    this.account_manager.start();
    log15.info("HI");
    const mainProcessTransport = new ElectronMainTransport((message) => {
      message.id = `main-${message.id}`;
      this.account_manager.send(JSON.stringify(message));
    });
    ipcMain5.handle("json-rpc-request", (_ev, message) => {
      this.account_manager.send(message);
    });
    this._jsonrpcRemote = new JRPCDeltaChat(mainProcessTransport, false);
    if (DesktopSettings.state.syncAllAccounts) {
      log15.info("Ready, starting accounts io...");
      this.jsonrpcRemote.rpc.startIoForAllAccounts();
      log15.info("Started accounts io.");
    }
    for (const account of await this.jsonrpcRemote.rpc.getAllAccountIds()) {
      this.jsonrpcRemote.rpc.setConfig(
        account,
        "verified_one_on_one_chats",
        "1"
      );
    }
  }
  webxdc = new DCWebxdc(this);
};

// src/ipc.ts
import { copyFile, writeFile as writeFile2, mkdir as mkdir2, rm as rm2 } from "fs/promises";
import {
  app as rawApp5,
  clipboard as clipboard3,
  dialog as dialog4,
  ipcMain as ipcMain6,
  nativeImage as nativeImage3,
  shell as shell5,
  systemPreferences
} from "electron";
import path3, {
  basename as basename3,
  extname,
  join as join14,
  posix,
  sep as sep2,
  dirname as dirname5,
  normalize
} from "path";
import { inspect } from "util";
import { platform as platform9 } from "os";
import { existsSync as existsSync6 } from "fs";
import { versions } from "process";
import { fileURLToPath as fileURLToPath6 } from "url";
const __dirname5 = dirname5(fileURLToPath6(import.meta.url));
const log16 = getLogger("main/ipc");
const app9 = rawApp5;
let dcController;
function getDCJsonrpcClient() {
  return dcController.jsonrpcRemote.rpc;
}
async function init3(cwd, logHandler2) {
  const main = main_exports;
  dcController = new DeltaChatController(cwd);
  try {
    await dcController.init();
  } catch (error) {
    log16.critical(
      "Fatal: The DeltaChat Module couldn't be loaded. Please check if all dependencies for deltachat-core are installed!",
      error,
      dcController.rpcServerPath
    );
    console.error(
      "Fatal: The DeltaChat Module couldn't be loaded. Please check if all dependencies for deltachat-core are installed!",
      error,
      dcController.rpcServerPath
    );
    dialog4.showErrorBox(
      "Fatal Error",
      `The DeltaChat Module couldn't be loaded.
  Please check if all dependencies for deltachat-core are installed!
  The Log file is located in this folder: ${getLogsPath()}

  ${dcController.rpcServerPath}

  ${error instanceof Error ? error.message : inspect(error, { depth: null })}`
    );
    rawApp5.exit(1);
  }
  ipcMain6.once("ipcReady", (_e) => {
    app9.ipcReady = true;
    app9.emit("ipcReady");
  });
  ipcMain6.on("show", () => main.show());
  ipcMain6.on(
    "handleLogMessage",
    (_e, channel, level, stacktrace, ...args) => logHandler2.log(channel, level, stacktrace, ...args)
  );
  ipcMain6.on("ondragstart", (event, filePath) => {
    let icon;
    try {
      icon = nativeImage3.createFromPath(
        join14(htmlDistDir(), "images/electron-file-drag-out.png")
      );
      if (icon.isEmpty()) {
        throw new Error("load failed");
      }
    } catch (error) {
      log16.warn("drag out icon could not be loaded", error);
      const size = 64 ** 2 * 4;
      const buffer = Buffer.alloc(size);
      for (let i = 0; i < size; i += 4) {
        buffer[i] = 0;
        buffer[i + 1] = 0;
        buffer[i + 2] = 0;
        buffer[i + 3] = 255;
      }
      icon = nativeImage3.createFromBitmap(buffer, { height: 64, width: 64 });
    }
    event.sender.startDrag({
      file: filePath,
      icon
    });
  });
  ipcMain6.on("help", async (_ev, locale, anchor) => {
    await openHelpWindow(locale, anchor);
  });
  ipcMain6.on("reload-main-window", () => {
    if (!window2) {
      throw new Error("window does not exist, this should never happen");
    }
    window2.webContents.reload();
  });
  ipcMain6.on("get-log-path", (ev) => {
    ev.returnValue = logHandler2.logFilePath();
  });
  ipcMain6.on("get-config-path", (ev) => {
    ev.returnValue = getConfigPath().split(sep2).join(posix.sep);
  });
  ipcMain6.on("get-rc-config", (ev) => {
    ev.returnValue = app9.rc;
  });
  ipcMain6.on("get-runtime-info", (ev) => {
    const info = {
      isMac: platform9() === "darwin",
      isAppx: appx,
      target: "electron",
      versions: [
        { label: "electron", value: versions.electron },
        { label: "node", value: versions.node }
      ],
      runningUnderARM64Translation: app9.runningUnderARM64Translation,
      rpcServerPath: dcController.rpcServerPath,
      buildInfo: BuildInfo,
      isContentProtectionSupported: platform9() === "darwin" || platform9() === "win32"
    };
    ev.returnValue = info;
  });
  ipcMain6.on("app-get-path", (ev, arg) => {
    ev.returnValue = app9.getPath(arg);
  });
  ipcMain6.handle("checkMediaAccess", (_ev, mediaType) => {
    if (!systemPreferences.getMediaAccessStatus) {
      return new Promise((resolve) => {
        resolve("unknown");
      });
    }
    if (mediaType === "camera") {
      return systemPreferences.getMediaAccessStatus("camera");
    } else if (mediaType === "microphone") {
      return systemPreferences.getMediaAccessStatus("microphone");
    } else {
      throw new Error("checkMediaAccess: unsupported media type");
    }
  });
  ipcMain6.handle(
    "askForMediaAccess",
    (_ev, mediaType) => {
      if (systemPreferences.askForMediaAccess) {
        if (mediaType === "camera") {
          return systemPreferences.askForMediaAccess("camera");
        } else if (mediaType === "microphone") {
          return systemPreferences.askForMediaAccess("microphone");
        }
      }
      return new Promise((resolve) => {
        resolve(void 0);
      });
    }
  );
  ipcMain6.handle("fileChooser", async (_ev, options) => {
    if (!window2) {
      throw new Error("window does not exist, this should never happen");
    }
    const returnValue = await dialog4.showOpenDialog(window2, options);
    window2.filePathWhiteList.push(...returnValue.filePaths);
    return returnValue;
  });
  let lastSaveDialogLocation = void 0;
  ipcMain6.handle(
    "saveFile",
    async (_ev, pathToSource, filename) => {
      if (!window2) {
        throw new Error("window does not exist, this should never happen");
      }
      let base_path = lastSaveDialogLocation || app9.getPath("downloads");
      if (!existsSync6(base_path)) {
        base_path = app9.getPath("downloads");
      }
      const { canceled, filePath } = await dialog4.showSaveDialog(
        window2,
        {
          defaultPath: join14(base_path, filename)
        }
      );
      if (!canceled && filePath) {
        try {
          await copyFile(pathToSource, filePath);
        } catch (error) {
          if (error.code == "EACCES") {
            dialog4.showErrorBox(
              "Permission Error",
              `Cannot write in this folder. You don't have write permission`
            );
          } else {
            dialog4.showErrorBox(
              "Unhandled Error",
              `Cannot copy file. Error: ${error}`
            );
          }
        }
        lastSaveDialogLocation = path3.dirname(filePath);
      }
    }
  );
  ipcMain6.handle("get-desktop-settings", async (_ev) => {
    return DesktopSettings.state;
  });
  ipcMain6.handle(
    "set-desktop-setting",
    (_ev, key, value) => {
      DesktopSettings.update({ [key]: value });
      if (key === "minimizeToTray") {
        updateTrayIcon();
      } else if (key === "contentProtectionEnabled") {
        updateContentProtectionOnAllActiveWindows(Boolean(value));
      }
      return true;
    }
  );
  ipcMain6.handle(
    "app.setBadgeCountAndTrayIconIndicator",
    (_, count) => {
      app9.setBadgeCount(count);
      set_has_unread(count !== 0);
    }
  );
  ipcMain6.handle(
    "app.writeTempFileFromBase64",
    (_ev, name, content) => writeTempFileFromBase64(name, content)
  );
  ipcMain6.handle(
    "app.writeTempFile",
    (_ev, name, content) => writeTempFile(name, content)
  );
  ipcMain6.handle("app.copyFileToInternalTmpDir", (_ev, name, pathToFile) => {
    return copyFileToInternalTmpDir(name, pathToFile);
  });
  ipcMain6.handle("app.removeTempFile", (_ev, path4) => removeTempFile(path4));
  ipcMain6.handle(
    "electron.shell.openExternal",
    (_ev, url2) => shell5.openExternal(url2)
  );
  ipcMain6.handle("electron.shell.openPath", (_ev, path4) => {
    return shell5.openPath(mapPackagePath(path4));
  });
  ipcMain6.handle("electron.clipboard.readText", () => {
    return clipboard3.readText();
  });
  ipcMain6.handle("electron.clipboard.readImage", () => {
    const image = clipboard3.readImage();
    if (image.isEmpty()) {
      return null;
    }
    return image.toDataURL();
  });
  ipcMain6.handle("electron.clipboard.writeText", (_ev, text) => {
    return clipboard3.writeText(text);
  });
  ipcMain6.handle("electron.clipboard.writeImage", (_ev, path4) => {
    return clipboard3.writeImage(nativeImage3.createFromPath(path4));
  });
  ipcMain6.handle(
    "saveBackgroundImage",
    async (_ev, file, isDefaultPicture) => {
      const originalFilePath = !isDefaultPicture ? file : join14(htmlDistDir(), "images/backgrounds/", file);
      const bgDir = join14(getConfigPath(), "background");
      await rm2(bgDir, { recursive: true, force: true });
      await mkdir2(bgDir, { recursive: true });
      const fileName = `background_${Date.now()}` + extname(originalFilePath);
      const newPath = join14(getConfigPath(), "background", fileName);
      try {
        await copyFile(originalFilePath, newPath);
      } catch (error) {
        log16.error("BG-IMG Copy Failed", error);
        throw error;
      }
      return `img: ${fileName.replace(/\\/g, "/")}`;
    }
  );
  ipcMain6.handle(
    "openMessageHTML",
    async (_ev, accountId, messageId, isContactRequest, subject, sender, receiveTime, content) => {
      openHtmlEmailWindow(
        accountId,
        messageId,
        isContactRequest,
        subject,
        sender,
        receiveTime,
        content
      );
    }
  );
  return () => {
    dcController.jsonrpcRemote.rpc.stopIoForAllAccounts();
  };
}
async function writeTempFileFromBase64(name, content) {
  await mkdir2(getDraftTempDir(), { recursive: true });
  const pathToFile = join14(getDraftTempDir(), basename3(name));
  log16.debug(`Writing base64 encoded file ${pathToFile}`);
  await writeFile2(pathToFile, Buffer.from(content, "base64"), "binary");
  return pathToFile;
}
async function writeTempFile(name, content) {
  await mkdir2(getDraftTempDir(), { recursive: true });
  const pathToFile = join14(getDraftTempDir(), basename3(name));
  log16.debug(`Writing tmp file ${pathToFile}`);
  await writeFile2(pathToFile, Buffer.from(content, "utf8"), "binary");
  return pathToFile;
}
async function copyFileToInternalTmpDir(fileName, sourcePath) {
  const sourceFileName = basename3(sourcePath);
  const sourceDir = dirname5(sourcePath);
  fileName = basename3(normalize(fileName));
  let destinationDir = join14(sourceDir, "..", INTERNAL_TMP_DIR_NAME);
  if (sourceFileName !== fileName) {
    destinationDir = join14(destinationDir, sourceFileName);
  }
  await mkdir2(destinationDir, { recursive: true });
  const targetPath = join14(destinationDir, fileName);
  await copyFile(sourcePath, targetPath);
  return targetPath;
}
async function removeTempFile(path4) {
  if (path4.indexOf(rawApp5.getPath("temp")) === -1 || path4.indexOf("..") !== -1) {
    log16.error(
      "removeTempFile was called with a path that is outside of the temp dir: ",
      path4
    );
    throw new Error("Path is outside of the temp folder");
  }
  await rm2(path4);
}

// src/notifications.ts
init_cjs_shim();
import { platform as platform10 } from "os";
import { app as app10, Notification, nativeImage as nativeImage4, ipcMain as ipcMain7 } from "electron";
const log17 = getLogger("main/notifications");
const isMac = platform10() === "darwin";
if (Notification.isSupported()) {
  ipcMain7.handle("notifications.show", showNotification);
  ipcMain7.handle("notifications.clear", clearNotificationsForChat);
  ipcMain7.handle("notifications.clearAll", clearAll);
  process.on("beforeExit", clearAll);
} else {
  ipcMain7.handle("notifications.show", () => {
  });
  ipcMain7.handle("notifications.clear", () => {
  });
  ipcMain7.handle("notifications.clearAll", () => {
  });
}
function createNotification(data) {
  let icon = data.icon ? data.icon.startsWith("data:") ? nativeImage4.createFromDataURL(data.icon) : nativeImage4.createFromPath(data.icon) : void 0;
  if (!icon || icon.isEmpty()) {
    if (!isMac) {
      icon = nativeImage4.createFromPath(appIcon());
    }
  }
  const notificationOptions = {
    title: data.title,
    // https://www.electronjs.org/docs/latest/tutorial/notifications#linux
    // says
    // > Notifications are sent using libnotify, which can show notifications
    // > on any desktop environment that follows
    // > [Desktop Notifications Specification](https://web.archive.org/web/20240428012536/https://specifications.freedesktop.org/notification-spec/notification-spec-latest.html)
    // Which says that the body supports limited markup
    // So let's escape it.
    body: platform10() === "linux" ? filterNotificationText(data.body) : data.body,
    icon,
    timeoutType: "default"
  };
  if (process.platform === "win32") {
    notificationOptions.closeButtonText = void 0;
  }
  return new Notification(notificationOptions);
}
function onClickNotification(accountId, chatId, msgId, _ev) {
  send("ClickOnNotification", {
    accountId,
    chatId,
    msgId
  });
  show();
  app10.focus();
  window2?.focus();
}
const notifications = {};
function showNotification(_event, data) {
  const { chatId, accountId } = data;
  log17.debug(
    "Creating notification:",
    Object.assign({}, data, { body: void 0, title: void 0 })
  );
  try {
    const notify = createNotification(data);
    notify.on("click", (Event2) => {
      onClickNotification(data.accountId, chatId, data.messageId, Event2);
      notifications[accountId][chatId] = notifications[accountId]?.[chatId]?.filter((n) => n !== notify) || [];
      notify.close();
    });
    notify.on("close", () => {
      if (isMac) {
        notifications[accountId][chatId] = notifications[accountId]?.[chatId]?.filter((n) => n !== notify) || [];
      }
      console.log("Notification close event triggered", notify);
    });
    if (!notifications[accountId]) {
      notifications[accountId] = {};
    }
    if (notifications[accountId][chatId]) {
      notifications[accountId][chatId].push(notify);
    } else {
      notifications[accountId][chatId] = [notify];
    }
    notify.show();
  } catch (error) {
    log17.warn("could not create notification:", error);
  }
}
function clearNotificationsForChat(_, accountId, chatId) {
  log17.debug("clearNotificationsForChat", { accountId, chatId, notifications });
  if (notifications[accountId]?.[chatId]) {
    for (const notify of notifications[accountId]?.[chatId] || []) {
      notify.close();
    }
    delete notifications[accountId][chatId];
  }
  log17.debug("after cleared Notifications", { accountId, chatId, notifications });
}
function clearAll() {
  for (const accountId of Object.keys(notifications)) {
    if (!Number.isNaN(Number(accountId))) {
      for (const chatId of Object.keys(notifications[Number(accountId)])) {
        if (!Number.isNaN(Number(chatId))) {
          clearNotificationsForChat(null, Number(accountId), Number(chatId));
        }
      }
    }
  }
}
function filterNotificationText(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// src/cleanup_temp_dir.ts
init_cjs_shim();
import { app as app11 } from "electron";
import { mkdir as mkdir3, readdir as readdir5, rm as rm3, rmdir as rmdir3 } from "fs/promises";
import { join as join15 } from "path";
import { readdirSync } from "fs";
const log18 = getLogger("main/cleanup_temp_dir");
async function cleanupDraftTempDir() {
  try {
    const path4 = getDraftTempDir();
    await mkdir3(path4, { recursive: true });
    if (path4.indexOf(app11.getPath("temp")) === -1 || path4.indexOf("..") !== -1) {
      log18.error(
        "removeTempFile was called with a path that is outside of the temp dir: ",
        path4
      );
      throw new Error("Path is outside of the temp folder");
    }
    const files = await readdir5(path4);
    if (files.length !== 0) {
      log18.debug(
        `found old ${files.length} temporary draft files, trying to delete them now`
      );
      const promises = [];
      for (const file of files) {
        log18.debug("delete", join15(path4, file));
        promises.push(rm3(join15(path4, file)));
      }
      await Promise.all(promises);
    }
    await rmdir3(path4);
  } catch (error) {
    log18.error("Cleanup of old temp files failed: ", error);
  }
}
async function cleanupInternalTempDirs() {
  try {
    let deletedTmpDirs = 0;
    const tmpDirents = readdirSync(getAccountsPath(), {
      withFileTypes: true
    }).filter((dirent) => dirent.isDirectory()).flatMap((accountDir) => {
      return readdirSync(join15(accountDir.parentPath, accountDir.name), {
        withFileTypes: true
      }).filter(
        (tmpDir) => tmpDir.isDirectory() && tmpDir.name === INTERNAL_TMP_DIR_NAME
      );
    });
    if (tmpDirents.length > 0) {
      deletedTmpDirs = (await Promise.all(
        tmpDirents.map(
          (tmpDir) => rm3(join15(tmpDir.parentPath, tmpDir.name), {
            recursive: true,
            force: true
          })
        )
      )).length;
    }
    log18.info(`Deleted ${deletedTmpDirs} internal tmp directories`);
  } catch (error) {
    log18.error("Cleanup of internal temp dirs failed: ", error);
  }
}

// src/index.ts
console.time("init");
import { mkdirSync, watchFile as watchFile2 } from "fs";
import { app as rawApp6, dialog as dialog5, ipcMain as ipcMain8, protocol as protocol2 } from "electron";
const hostRules = "MAP * ~NOTFOUND, EXCLUDE *.openstreetmap.org";
rawApp6.commandLine.appendSwitch("host-resolver-rules", hostRules);
rawApp6.commandLine.appendSwitch("host-rules", hostRules);
rawApp6.commandLine.appendSwitch("disable-features", "IsolateSandboxedIframes");
if (rc_default["version"] === true || rc_default["v"] === true) {
  console.info(BuildInfo.VERSION);
  process.exit();
}
if (rc_default["help"] === true || rc_default["h"] === true) {
  getHelpMenu2();
  process.exit();
}
protocol2.registerSchemesAsPrivileged([
  {
    scheme: "webxdc",
    privileges: {
      // This gives apps access to APIs such as
      // - Web Cryptography
      // - Web Share
      // , also see https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts/features_restricted_to_secure_contexts
      //
      // To give a brief explanation of what "secure context" is:
      // Generally all websites served thorugh `https` (and not through `http`)
      // are in a "secure context".
      //
      // For reference:
      // - https://support.delta.chat/t/allow-access-to-camera-geolocation-other-web-apis/2446?u=wofwca
      //
      // Note that APIs requiring explicit user permission (such as camera)
      // still don't work, see
      // https://github.com/deltachat/deltachat-desktop/blob/455a4d01501ed82f9d8e0a36064ffbc3981722ee/src/main/deltachat/webxdc.ts#L457-L473
      //
      // In terms of `isSecureContext`, webxdc apps are similar to files,
      // extensions, and FirefoxOS apps, i.e. ["Packaged Applications"]
      // (https://w3c.github.io/webappsec-secure-contexts/#packaged-applications),
      // so `secure: true` is applicable.
      secure: true,
      allowServiceWorkers: true,
      standard: true,
      supportFetchAPI: true,
      stream: true
      // needed for audio playback
    }
  }
]);
const app12 = rawApp6;
app12.rc = rc_default;
if (!process.mas && !app12.requestSingleInstanceLock() && !process.env.DC_TEST_DIR) {
  console.error("Only one instance allowed. Quitting.");
  app12.quit();
  process.exit(0);
}
mkdirSync(getConfigPath(), { recursive: true });
mkdirSync(getLogsPath(), { recursive: true });
mkdirSync(getCustomThemesPath(), { recursive: true });
const logHandler = createLogHandler();
const log19 = getLogger("main/index");
setLogHandler(logHandler.log, rc_default);
log19.info(
  `Deltachat Version ${BuildInfo.VERSION} ${BuildInfo.GIT_REF} ${BuildInfo.BUILD_TIMESTAMP}`
);
process.on("exit", logHandler.end);
process.on("uncaughtException", (err) => {
  const error = { message: err.message, stack: err.stack };
  if (log19) {
    log19.error("uncaughtError", error);
  } else {
    console.error("uncaughtException", error);
  }
  dialog5.showErrorBox(
    "Error - uncaughtException",
    `See the logfile (${logHandler.logFilePath()}) for details and contact the developers about this issue:
` + JSON.stringify(error)
  );
});
app12.ipcReady = false;
app12.isQuitting = false;
Promise.all([
  new Promise((resolve, _reject) => app12.on("ready", resolve)),
  DesktopSettings.load(),
  isWindowsStorePackage(),
  webxdcStartUpCleanup()
]).then(onReady).catch((error) => {
  log19.critical("Fatal Error during init", error);
  dialog5.showErrorBox(
    "Fatal Error during init",
    `[Version: ${BuildInfo.VERSION} | ${platform11()} | ${arch2()}]]
${error}

Also make sure you are not trying to run multiple instances of deltachat.`
  );
  process.exit(1);
});
let ipc_shutdown_function = null;
async function onReady([_appReady, _loadedState, _appx, _webxdc_cleanup]) {
  acceptThemeCLI();
  setLanguage(DesktopSettings.state.locale || app12.getLocale());
  const cwd = getAccountsPath();
  log19.info(`cwd ${cwd}`);
  ipc_shutdown_function = await init3(cwd, logHandler);
  init({ hidden: app12.rc["minimized"] });
  init2(logHandler);
  if (rc_default.devmode) {
    toggleDevTools();
  }
  if (app12.rc["translation-watch"]) {
    watchFile2(
      join16(getLocaleDirectoryPath(), "/_untranslated_en.json"),
      (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          log19.info("translation-watch: File changed reloading translation data");
          chooseLanguage(getCurrentLocaleDate().locale);
          log19.info("translation-watch: reloading translation data - done");
        }
      }
    );
  }
  cleanupLogFolder().catch(
    (err) => log19.error("Cleanup of old logfiles failed: ", err)
  );
  cleanupDraftTempDir();
  cleanupInternalTempDirs();
  initialisePowerMonitor();
}
;
app12.once("ipcReady", () => {
  if (!window2) {
    throw new Error("window does not exist, this should never happen");
  }
  console.timeEnd("init");
  if (process.env.NODE_ENV === "test") {
    window2.maximize();
  }
  updateTrayIcon();
  window2.on("close", (e) => {
    log19.debug("mainWindow.window.on('close')");
    if (!app12.isQuitting) {
      e.preventDefault();
      if (app12.rc["minimized"] || DesktopSettings.state.minimizeToTray) {
        log19.debug("mainWindow.window.on('close') Hiding main window");
        hideDeltaChat();
      } else {
        if (process.platform === "darwin") {
          log19.debug(
            "mainWindow.window.on('close') We are on mac, so lets hide the main window"
          );
          hideDeltaChat();
        } else {
          log19.debug("mainWindow.window.on('close') Quitting deltachat");
          quit(e);
        }
      }
    }
  });
});
function quit(e) {
  if (app12.isQuitting)
    return;
  app12.isQuitting = true;
  e?.preventDefault();
  log19.info("Starting app shutdown process");
  try {
    window2?.close();
    window2?.destroy();
  } catch (error) {
    log19.error("failed to close window, error:", error);
  }
  ipc_shutdown_function && ipc_shutdown_function();
  cleanupDraftTempDir();
  function doQuit() {
    log19.info("Quitting now. Bye.");
    app12.quit();
  }
  DesktopSettings.saveImmediate().then(() => {
    setTimeout(doQuit, 500);
  });
  setTimeout(() => {
    log19.error("Saving state took too long. Quitting.");
    doQuit();
  }, 4e3);
}
app12.on("activate", () => {
  log19.debug("app.on('activate')");
  if (!window2) {
    log19.warn("window not set, this is normal on startup");
    return;
  }
  if (window2.isVisible() === false) {
    log19.debug("app.on('activate') showing main window");
    showDeltaChat();
  } else {
    log19.debug("app.on('activate') mainWindow is visible, no need to show it");
  }
});
app12.on("before-quit", (e) => quit(e));
app12.on("window-all-closed", () => quit());
app12.on("web-contents-created", (_ev, contents) => {
  const is_webxdc = contents.session.storagePath && contents.session.storagePath.indexOf("webxdc_") !== -1;
  if (is_webxdc) {
    const webxdcOpenUrl = (url2) => {
      if (url2.startsWith("mailto:") || url2.startsWith("openpgp4fpr:")) {
        open_url(url2);
        window2?.show();
      }
    };
    contents.on("will-navigate", (ev, navigationUrl) => {
      if (navigationUrl.startsWith("webxdc://")) {
        return;
      } else if (navigationUrl.startsWith("mailto:")) {
        ev.preventDefault();
        webxdcOpenUrl(navigationUrl);
      } else {
        ev.preventDefault();
      }
    });
    contents.on("will-frame-navigate", (ev) => {
      if (ev.url.startsWith("webxdc://")) {
        return;
      } else if (ev.url.startsWith("mailto:")) {
        ev.preventDefault();
        webxdcOpenUrl(ev.url);
      } else {
        ev.preventDefault();
      }
    });
    contents.setWindowOpenHandler((_details) => {
      webxdcOpenUrl(_details.url);
      return { action: "deny" };
    });
  } else {
    contents.on("will-navigate", (e, navigationUrl) => {
      log19.warn("blocked navigation attempt to", navigationUrl);
      e.preventDefault();
    });
    contents.setWindowOpenHandler((_details) => {
      return { action: "deny" };
    });
  }
  contents.on("will-attach-webview", (event, _webPreferences, _params) => {
    event.preventDefault();
  });
});
electron_context_menu_default();
import { join as join16 } from "path";
import { arch as arch2, platform as platform11 } from "os";
openUrlsAndFilesFromArgv(process.argv);
ipcMain8.handle("restart_app", async (_ev) => {
  app12.relaunch();
  app12.quit();
});
export {
  quit
};
/*! Bundled license information:

deep-extend/lib/deep-extend.js:
  (*!
   * @description Recursive object extending
   * @author Viacheslav Lotsmanov <lotsmanov89@gmail.com>
   * @license MIT
   *
   * The MIT License (MIT)
   *
   * Copyright (c) 2013-2018 Viacheslav Lotsmanov
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy of
   * this software and associated documentation files (the "Software"), to deal in
   * the Software without restriction, including without limitation the rights to
   * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
   * the Software, and to permit persons to whom the Software is furnished to do so,
   * subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
   * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
   * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
   * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
   * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
   *)
*/
//# sourceMappingURL=index.js.map
