default: handler.zip

handler.zip: handler.js node_modules
	zip -r handler.zip handler.js node_modules

node_modules:
	yarn

handler.js: node_modules
	tsc handler.ts