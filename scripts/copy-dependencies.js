// Copies vendored library files from node_modules into the app's css/ and js/ folders.
// To vendor a new library, add its files to DEPENDENCIES.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const DEPENDENCIES = [
    { from: "bootstrap/dist/css/bootstrap.min.css", to: "css" },
    { from: "bootstrap/dist/js/bootstrap.bundle.min.js", to: "js" },
    { from: "bootstrap-icons/font/bootstrap-icons.min.css", to: "css" },
    { from: "bootstrap-icons/font/fonts/bootstrap-icons.woff2", to: "css/fonts" },
    { from: "bootstrap-icons/font/fonts/bootstrap-icons.woff", to: "css/fonts" },
    { from: "cytoscape/dist/cytoscape.min.js", to: "js" },
    { from: "pyodide/pyodide.js", to: "js/pyodide" },
    { from: "pyodide/pyodide.asm.mjs", to: "js/pyodide" },
    { from: "pyodide/pyodide.asm.wasm", to: "js/pyodide" },
    { from: "pyodide/pyodide-lock.json", to: "js/pyodide" },
    { from: "pyodide/python_stdlib.zip", to: "js/pyodide" },
];


function copyDependency({ from, to }) {
    const source = path.join(ROOT, "node_modules", from);
    const destinationDir = path.join(ROOT, to);

    if (!fs.existsSync(source)) {
        throw new Error(`Missing ${source}. Run "npm install" first.`);
    }

    fs.mkdirSync(destinationDir, { recursive: true });
    fs.copyFileSync(source, path.join(destinationDir, path.basename(from)));
}


DEPENDENCIES.forEach(copyDependency);

console.log("Dependencies copied successfully.");
