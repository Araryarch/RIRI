#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { tokenize } from './lexer';
import { Parser } from './parser';
import { CodeGenerator } from './codegen';

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        printUsage();
        process.exit(1);
    }

    const command = args[0];
    const filePath = args[1];

    if (command !== 'run' && command !== 'build' && command !== 'show') {
        console.error("Unknown command:", command);
        printUsage();
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        process.exit(1);
    }

    const input = fs.readFileSync(filePath, "utf-8");

    try {
        // 1. Tokenize
        const tokens = tokenize(input);

        // 2. Parse
        const parser = new Parser(tokens);
        const program = parser.produceAST();

        // 3. Codegen
        const generator = new CodeGenerator(program);
        const cCode = generator.generate();

        // 4. Handle Commands
        if (command === 'show') {
            console.log(cCode);
            return;
        }

        // 5. Transform to C++ (File)
        const fileName = path.basename(filePath, path.extname(filePath));
        const cppFilePath = path.resolve(path.dirname(filePath), `${fileName}.cpp`);
        const exePath = path.resolve(path.dirname(filePath), fileName);

        fs.writeFileSync(cppFilePath, cCode);

        // 6. Compile with G++ (C++20)
        try {
            execSync(`g++ -std=c++20 "${cppFilePath}" -o "${exePath}"`, { stdio: 'inherit' });
        } catch (e) {
            console.error("Compilation failed.");
            // Only cleanup if it's a temp run
            if (command === 'run') cleanup(cppFilePath, exePath);
            process.exit(1);
        }

        // 7. Run or Build
        if (command === 'run') {
            try {
                execSync(`"${exePath}"`, { stdio: 'inherit' });
            } catch (e) {
                console.error("Execution failed.");
            }
            cleanup(cppFilePath, exePath);
        } else if (command === 'build') {
            console.log(`Build successful: ${exePath}`);
            // Keep exe, delete cpp
            if (fs.existsSync(cppFilePath)) fs.unlinkSync(cppFilePath);
        }

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

function printUsage() {
    console.log("Usage:");
    console.log("  rrc run <file.rr>   - Compile and run");
    console.log("  rrc build <file.rr> - Compile to executable");
    console.log("  rrc show <file.rr>  - Show transpiled C++ code");
}

function cleanup(cFile: string, exeFile: string) {
    if (fs.existsSync(cFile)) fs.unlinkSync(cFile);
    if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
}

main();
