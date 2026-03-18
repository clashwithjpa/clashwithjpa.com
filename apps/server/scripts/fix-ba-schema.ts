#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const schemaPath = resolve(import.meta.dir, "../src/lib/db/schema/ba-auth.ts");

try {
    let content = readFileSync(schemaPath, "utf-8");

    // Add .unique() to accountId if it's missing
    const accountIdPattern = /accountId:\s*text\("account_id"\)\.notNull\(\)(?!\.unique)/g;

    if (accountIdPattern.test(content)) {
        content = content.replace(accountIdPattern, 'accountId: text("account_id").notNull().unique()');
        writeFileSync(schemaPath, content);
        console.log("✓ Added .unique() to accountId field");
    } else {
        console.log("✓ accountId field already has .unique()");
    }
} catch (error) {
    console.error("Error fixing schema:", error);
    process.exit(1);
}
