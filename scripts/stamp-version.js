// Stamps a new version onto the app's own scripts and stylesheet in index.html ("?v=...").
// Browsers keep files for a while after a deploy; a new version makes them fetch every changed
// file together, so an updated page never runs with an older cached script. Run before deploying.

const fs = require("fs");
const path = require("path");

const INDEX = path.resolve(__dirname, "..", "index.html");
const VERSIONED_LINK = /(\.(?:js|css))\?v=[\w.-]+"/g;


function timestamp() {
    return new Date().toISOString().slice(0, 16).replace(/\D/g, "");
}


const version = timestamp();
const html = fs.readFileSync(INDEX, "utf8");
const stamped = html.replace(VERSIONED_LINK, `$1?v=${version}"`);

fs.writeFileSync(INDEX, stamped);
console.log(`Stamped version ${version} on ${(html.match(VERSIONED_LINK) || []).length} files.`);
