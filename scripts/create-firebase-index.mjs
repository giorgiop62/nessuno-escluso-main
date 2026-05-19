import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const assetsDir = join(clientDir, "assets");

const assetNames = await readdir(assetsDir);
const jsAssets = assetNames.filter((name) => name.endsWith(".js"));
const cssAssets = assetNames.filter((name) => name.endsWith(".css")).sort();

let entryScript;
for (const assetName of jsAssets) {
  const source = await readFile(join(assetsDir, assetName), "utf8");
  if (source.includes("hydrateRoot(document")) {
    entryScript = assetName;
    break;
  }
}

if (!entryScript) {
  throw new Error("Could not find the TanStack Start client entry in dist/client/assets.");
}

const cssLinks = cssAssets
  .map((name) => `    <link rel="stylesheet" href="/assets/${name}">`)
  .join("\n");

const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nessuno Escluso</title>
${cssLinks}
  </head>
  <body>
    <main class="flex min-h-screen items-center justify-center px-5">
      <p class="font-hand text-3xl">Carico Nessuno Escluso...</p>
    </main>
    <script type="module" src="/assets/${entryScript}"></script>
  </body>
</html>
`;

await writeFile(join(clientDir, "index.html"), html);
console.log(`Created dist/client/index.html using /assets/${entryScript}`);
