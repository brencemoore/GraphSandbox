# GraphSandbox

A browser sandbox for creating and analyzing simple graphs.

## Git

- Work only on the `claude` branch. Never commit to or check out `main`.
- Commit locally at the end of every prompt that changes files.
- Never push.

## Dependencies

- Do not add any package (npm, Python, or CDN) without asking first.
- Third-party files are vendored: npm installs them, `scripts/copy-dependencies.js` copies them into `css/` and `js/` (runs on `npm install`). New dependencies are added to its `DEPENDENCIES` list; never edit the copied files.
- Graph math runs in Python via Pyodide: core files are vendored in `js/pyodide/`; NumPy, SciPy and NetworkX load from Pyodide's CDN at runtime. Analyses live in `py/graph_math.py`.

## Running

- `npm start` serves the app at http://localhost:8000 (`scripts/serve.py`). Pyodide does not work from `file://`.

## Code style

- Match the existing code in this repo, not other projects (e.g. PINN).
- Readable, maintainable, and scalable over clever: small single-purpose functions and files, descriptive names.
- 4-space indentation. Short comments only to label sections (`<!-- Sidebar -->`, `// Graph Canvas`).
- HTML: one attribute per line when an element has several; blank lines between sections.

## Frontend

- Plain JavaScript (CommonJS project), no frameworks.
- Use Bootstrap components and utility classes for layout and styling. Keep markup uncluttered.
- Ask before adding custom CSS. Any approved CSS goes in `css/style.css`, grouped by component.

## Prompts

- After finishing a job make sure to give the user any instructions needed to test and run the code/project themselves.
