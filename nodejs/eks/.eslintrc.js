/*
👋 Hi! This file was autogenerated by tslint-to-eslint-config.
https://github.com/typescript-eslint/tslint-to-eslint-config

It represents the closest reasonable ESLint configuration to this
project's original TSLint configuration.

We recommend eventually switching this configuration to extend from
the recommended rulesets in typescript-eslint. 
https://github.com/typescript-eslint/tslint-to-eslint-config/blob/master/docs/FAQs.md

Happy linting! 💖
*/
module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: ["prettier"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "tsconfig.json",
        sourceType: "module",
    },
    plugins: [
        "eslint-plugin-jsdoc",
        "eslint-plugin-import",
        "@typescript-eslint",
        "@typescript-eslint/tslint",
        "@pulumi/eslint-plugin",
    ],
    root: true,
    rules: {
        "@typescript-eslint/dot-notation": "off",
        "@typescript-eslint/explicit-function-return-type": [
            "off",
            {
                allowExpressions: false,
                allowTypedFunctionExpressions: false,
                allowHigherOrderFunctions: false,
                allowDirectConstAssertionInArrowFunctions: true,
                allowConciseArrowFunctionExpressionsStartingWithVoid: true,
            },
        ],
        "@typescript-eslint/explicit-member-accessibility": [
            "off",
            {
                accessibility: "explicit",
            },
        ],
        "@typescript-eslint/explicit-module-boundary-types": [
            "off",
            {
                allowArgumentsExplicitlyTypedAsAny: true,
                allowDirectConstAssertionInArrowFunctions: true,
                allowHigherOrderFunctions: false,
                allowTypedFunctionExpressions: false,
            },
        ],
        "@typescript-eslint/member-ordering": "off",
        "@typescript-eslint/naming-convention": [
            "error",
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE"],
                leadingUnderscore: "allow",
                trailingUnderscore: "forbid",
            },
        ],
        "@typescript-eslint/no-empty-function": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/typedef": [
            "off",
            {
                parameter: true,
                propertyDeclaration: true,
                variableDeclaration: true,
                memberVariableDeclaration: true,
            },
        ],
        "arrow-parens": ["off", "always"],
        "brace-style": ["error", "1tbs"],
        "comma-dangle": ["error", "always-multiline"],
        curly: "error",
        "default-case": "error",
        "dot-notation": "off",
        "eol-last": "error",
        eqeqeq: ["error", "smart"],
        "guard-for-in": "error",
        "id-denylist": [
            "error",
            "any",
            "Number",
            "number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined",
        ],
        "id-match": "error",
        "import/order": [
            "off",
            {
                alphabetize: {
                    caseInsensitive: true,
                    order: "asc",
                },
                "newlines-between": "ignore",
                groups: [
                    ["builtin", "external", "internal", "unknown", "object", "type"],
                    "parent",
                    ["sibling", "index"],
                ],
                distinctGroup: false,
                pathGroupsExcludedImportTypes: [],
                pathGroups: [
                    {
                        pattern: "./",
                        patternOptions: {
                            nocomment: true,
                            dot: true,
                        },
                        group: "sibling",
                        position: "before",
                    },
                    {
                        pattern: ".",
                        patternOptions: {
                            nocomment: true,
                            dot: true,
                        },
                        group: "sibling",
                        position: "before",
                    },
                    {
                        pattern: "..",
                        patternOptions: {
                            nocomment: true,
                            dot: true,
                        },
                        group: "parent",
                        position: "before",
                    },
                    {
                        pattern: "../",
                        patternOptions: {
                            nocomment: true,
                            dot: true,
                        },
                        group: "parent",
                        position: "before",
                    },
                ],
            },
        ],
        indent: "off",
        "jsdoc/check-alignment": "off",
        "jsdoc/check-indentation": "off",
        "jsdoc/newline-after-description": "off",
        "linebreak-style": "off",
        "max-len": "off",
        "new-parens": "off",
        "newline-per-chained-call": "off",
        "no-bitwise": "off",
        "no-caller": "error",
        "no-cond-assign": "off",
        "no-console": [
            "error",
            {
                allow: [
                    "log",
                    "warn",
                    "dir",
                    "timeLog",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupEnd",
                    "table",
                    "dirxml",
                    "error",
                    "groupCollapsed",
                    "Console",
                    "profile",
                    "profileEnd",
                    "timeStamp",
                    "context",
                    "createTask",
                ],
            },
        ],
        "no-debugger": "error",
        "no-empty": "error",
        "no-empty-function": "off",
        "no-eval": "error",
        "no-extra-semi": "off",
        "no-fallthrough": "error",
        "no-irregular-whitespace": "off",
        "no-multiple-empty-lines": "off",
        "no-new-wrappers": "error",
        "no-redeclare": "error",
        "no-trailing-spaces": "error",
        "no-underscore-dangle": "off",
        "no-unused-expressions": "off",
        "no-unused-labels": "error",
        "no-use-before-define": "off",
        "no-var": "error",
        "padded-blocks": [
            "off",
            {
                blocks: "never",
            },
            {
                allowSingleLineBlocks: true,
            },
        ],
        "prefer-const": "error",
        "quote-props": "off",
        quotes: "off",
        radix: "error",
        "react/jsx-curly-spacing": "off",
        "react/jsx-equals-spacing": "off",
        "react/jsx-tag-spacing": [
            "off",
            {
                afterOpening: "allow",
                closingSlash: "allow",
            },
        ],
        "react/jsx-wrap-multilines": "off",
        semi: "off",
        "space-before-function-paren": "off",
        "space-in-parens": ["off", "never"],
        "spaced-comment": [
            "error",
            "always",
            {
                markers: ["/"],
            },
        ],
        "@pulumi/no-output-in-template-literal": "error",
        "@pulumi/no-output-instance-in-template-literal": "error",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                rules: {
                    "file-header": [true, "Copyright 2016-\\d{4}, Pulumi Corporation."],
                    whitespace: [
                        true,
                        "check-branch",
                        "check-decl",
                        "check-module",
                        "check-separator",
                        "check-type",
                    ],
                },
            },
        ],
    },
};
