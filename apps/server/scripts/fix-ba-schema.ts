import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const schemaPath = resolve(import.meta.dirname, "../src/lib/db/schema/ba-auth.ts");

// Re-applied after every `ba:generate`, which rewrites the schema wholesale.
// Neither patch can be expressed through better-auth's own config, so the file
// has to be edited rather than configured.
const patches = [
    {
        name: ".unique() on accountId",
        find: /accountId:\s*text\("account_id"\)\.notNull\(\)(?!\.unique)/,
        replace: 'accountId: text("account_id").notNull().unique()',
    },
    {
        // A key is refused once its owner is gone, because the owner is re-read
        // on every request, but without this the row and its usage history sit
        // there for good. Sound only because `referenceId` names a user in our
        // config; the plugin can also point it at an organization.
        name: "cascade from apikey.referenceId to user",
        find: /referenceId:\s*text\("reference_id"\)\.notNull\(\)(?!\s*\.references)/,
        replace: 'referenceId: text("reference_id")\n            .notNull()\n            .references(() => user.id, { onDelete: "cascade" })',
    },
];

try {
    let content = readFileSync(schemaPath, "utf-8");
    let changed = false;

    for (const { name, find, replace } of patches) {
        if (!find.test(content)) {
            console.log(`✓ ${name} already applied`);
            continue;
        }
        content = content.replace(find, replace);
        changed = true;
        console.log(`✓ applied ${name}`);
    }

    if (changed) writeFileSync(schemaPath, content);
} catch (error) {
    console.error("Error fixing schema:", error);
    process.exit(1);
}
