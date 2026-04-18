const fs = require("fs");

const file = process.env["GITHUB_OUTPUT"];
var stream = fs.createWriteStream(file, { flags: "a" });

const outputNames = (process.env["INPUT_OUTPUTS"] || "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const sensitivePrefixes = ["SECRET", "TOKEN", "KEY", "PASSWORD", "CREDENTIAL"];

for (const name of outputNames) {
  const value = process.env[name];

  if (value === undefined) {
    continue;
  }

  if (sensitivePrefixes.some((prefix) => name.toUpperCase().startsWith(prefix))) {
    continue;
  }

  try {
    stream.write(`${name}<<EEEOOOFFF\n${value}\nEEEOOOFFF\n`); // << syntax accommodates multiline strings.
  } catch (err) {
    console.log(`error: failed to set output for ${name}: ${err.message}`);
  }
}

stream.end();
