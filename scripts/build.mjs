import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const target = join(root, "dist/plugin-eval-replay-lab");
await rm(join(root, "dist"), { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const entry of ["index.html","styles.css","src","examples","README.md","LICENSE","PRIVACY.md","SECURITY.md","SUPPORT.md","CONTRIBUTING.md","CODE_OF_CONDUCT.md","CHANGELOG.md","docs","skills","plugin.json","package.json","package-lock.json",".github","cli.mjs","server.mjs"]) {
  await cp(join(root, entry), join(target, entry), { recursive: true });
}
await mkdir(join(target, "launch"), { recursive: true });
for (const entry of ["COVER_DESIGN.md", "plugin-eval-replay-lab-cover.png"]) {
  await cp(join(root, "launch", entry), join(target, "launch", entry));
}
