const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const pluginImport = require("eslint-plugin-import");
// const eslintConfigGoogle = require("eslint-config-google"); // eslint-config-google is not directly compatible with flat config

module.exports = [
  {
    // This section applies to JS configuration files like eslint.config.js itself.
    // It prevents TypeScript-ESLint from trying to parse them with project-specific type info.
    files: ["*.js", "*.cjs", "*.mjs"], // Target JS-like files
    languageOptions: {
      sourceType: "commonjs", // Assuming eslint.config.js is CommonJS
      globals: {
        ...globals.node, // Node.js globals
        __dirname: "readonly", // Define __dirname as a global for CommonJS modules
      },
    },
    rules: {
      // You might want to relax or set different rules for JS config files if needed
      // For example, if you use single quotes in JS but double in TS:
      // "quotes": ["error", "single"],
    }
  },
  {
    ignores: ["lib/**/*", "eslint.config.js"], // Also ignore eslint.config.js from main TS linting
  },
  pluginJs.configs.recommended, // Corresponds to "eslint:recommended"
  ...tseslint.configs.recommended, // Corresponds to "plugin:@typescript-eslint/recommended"
  // For eslint-config-google, you might need to manually pick rules or find a flat-config compatible version.
  // For now, we'll omit it to keep things simpler and focus on core linting.
  {
    // This section applies to your TypeScript source files
    files: ["src/**/*.ts", "src/**/*.tsx"], // Target only TS/TSX files in src
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
      parser: tseslint.parser, // Corresponds to parser
      parserOptions: { // Corresponds to parserOptions
        project: ["tsconfig.json", "tsconfig.dev.json"],
        tsconfigRootDir: __dirname, // Important for resolving tsconfig.json relative to this eslint.config.js
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin, // Corresponds to plugins array
      "import": pluginImport, // Corresponds to plugins array
    },
    settings: { // Corresponds to settings
      "import/resolver": {
        "node": {
          "paths": ["src"],
          "moduleDirectory": ["node_modules", "src/"],
        },
        "typescript": {
          "project": "tsconfig.json",
        },
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
    rules: { // Corresponds to rules
      "quotes": ["error", "double"],
      "import/no-unresolved": "off", // Often better handled by TypeScript itself
      "indent": ["error", 2],
      "linebreak-style": "off",
      "object-curly-spacing": ["error", "always"],
      "max-len": ["error", { "code": 120 }],
      "@typescript-eslint/no-explicit-any": "off",
      // Add any specific rules from eslint-config-google you rely on here, if needed
      // Example of a google config rule (you'd need to check its current status/necessity):
      // "valid-jsdoc": "off", 
      // "require-jsdoc": "off"
    },
  },
]; 