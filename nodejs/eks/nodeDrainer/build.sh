#!/bin/bash
yarn
tsc handler.ts
zip -r handler.zip handler.js node_modules
