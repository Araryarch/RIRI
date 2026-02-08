import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export function runTests(dir: string = "tests") {
    const testDir = path.resolve(process.cwd(), dir);

    if (!fs.existsSync(testDir)) {
        console.error(`Test directory not found: ${testDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(testDir)
        .filter(f => f.endsWith(".rr"))
        .sort();

    console.log(`Found ${files.length} tests in ${testDir}\n`);

    let passed = 0;
    let failed = 0;

    // Determine how to run rrc. 
    // If we are running from source (ts-node/bun), we might need to target the entry point.
    // For now, let's assume valid 'rrc' command is NOT globally installed,
    // so we use the current process command structure or a fallback.
    // Actually, 'bun run src/index.ts' is how we run it locally.
    // Let's deduce the runner.

    // We can assume we are running inside the project dev environment.
    const runner = "bun run src/index.ts";

    for (const file of files) {
        const filePath = path.join(testDir, file);
        process.stdout.write(`Testing ${file}... `);

        try {
            // Run the test file
            // We expect the test file to print "PASS" or "FAIL" explicitly?
            // Or just exit code 0?
            // Our current tests print "ALL TESTS PASSED" on success.

            const cmd = `${runner} run "${filePath}"`;
            const output = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

            if (output.includes("ALL TESTS PASSED")) {
                console.log("✅ PASS");
                passed++;
            } else if (output.includes("FAIL")) {
                console.log("❌ LOGIC FAIL");
                console.log(output); // Show output for debug
                failed++;
            } else {
                console.log("⚠️  NO SUCCESS MSG");
                console.log(output);
                failed++;
            }

        } catch (e: any) {
            console.log("❌ CRASH");
            // If execSync fails (non-zero exit code)
            if (e.stdout) console.log(e.stdout.toString());
            if (e.stderr) console.log(e.stderr.toString());
            failed++;
        }
    }

    console.log("\n" + "=".repeat(30));
    console.log(`Results: ${passed} PASSED, ${failed} FAILED`);

    if (failed > 0) {
        process.exit(1);
    }
}
