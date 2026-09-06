import { existsSync, readFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
    console.error("usage: changelog-section.mjs <version>");
    process.exit(1);
}

if (!existsSync("CHANGELOG.md")) {
    process.exit(0);
}

const lines = readFileSync("CHANGELOG.md", "utf8").split("\n");
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));

if (start === -1) {
    process.exit(0);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## [")) {
        end = i;
        break;
    }
}

process.stdout.write(
    lines
        .slice(start + 1, end)
        .join("\n")
        .trim(),
);
