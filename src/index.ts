#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { tokenize } from './lexer';
import { Parser } from './parser';
import { NodeType } from './ast';
import { CodeGenerator } from './codegen';

function main() {
    const args = process.argv.slice(2);

    // Check for g++ availability
    try {
        execSync('g++ --version', { stdio: 'ignore' });
    } catch (e) {
        console.warn("⚠️  Warning: 'g++' not found in PATH.");
        console.warn("   RiriLang requires a C++20 compiler to build/run code.");
        console.warn("   Please install g++ (e.g., 'sudo apt install g++' or MinGW on Windows).");
        // We don't exit(1) because maybe they just want to 'show' code or 'test'? 
        // But for 'run'/'build' it will fail.
        // Let's just warn.
    }

    if (args.length < 1) {
        printUsage();
        process.exit(1);
    }

    const command = args[0];
    const filePath = args[1];

    if (command === 'test') {
        const { runTests } = require('./testing');
        // Optional second arg could be specific dir
        const targetDir = args[1] || "tests";
        runTests(targetDir);
        return;
    }

    if (command === '--help' || command === '-h') {
        printUsage();
        process.exit(0);
    }

    if (command === '--version' || command === '-v') {
        console.log("RiriLang v1.0.0");
        process.exit(0);
    }

    if (command !== 'run' && command !== 'build' && command !== 'show' && command !== 'test') {
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

        // 2. Parse
        const parser = new Parser(tokens);
        let program = parser.produceAST();

        // 2.5 Resolve Imports (Recursive)
        const visited = new Set<string>();
        visited.add(path.resolve(filePath)); // Add main file

        function resolveImports(prog: any, baseDir: string) {
            if (!prog.body) return;

            // We need to iterate backwards or create a new body to handle injections
            // But imports are typically at top.
            // Let's create a new body list.
            const newBody: any[] = [];

            for (const stmt of prog.body) {
                if (stmt.kind === NodeType.ImportDeclaration) {
                    // We can't easily import NodeType here without type issues if not careful, 
                    // but we imported Parse/Token/Codegen.
                    // Let's assume NodeType.ImportDeclaration is available or use raw check if needed.
                    // Actually we can import { NodeType } from './ast';
                    // We need to add that import to index.ts first.

                    const importPath = (stmt as any).path;
                    const fullPath = path.resolve(baseDir, importPath);

                    if (visited.has(fullPath)) {
                        continue; // Skip circular or duplicate
                    }
                    visited.add(fullPath);

                    if (!fs.existsSync(fullPath)) {
                        console.error("Import not found:", fullPath);
                        process.exit(1);
                    }

                    const subSource = fs.readFileSync(fullPath, "utf-8");
                    const subTokens = tokenize(subSource);
                    const subParser = new Parser(subTokens);
                    const subProg = subParser.produceAST();

                    // Recursively resolve imports in sub-file
                    resolveImports(subProg, path.dirname(fullPath));

                    // Add sub-program body to newBody
                    newBody.push(...subProg.body);
                } else {
                    newBody.push(stmt);
                }
            }
            prog.body = newBody;
        }

        // We need to import NodeType to check kind safely, or use the integer value 4 
        // (Program=0, VarDecl=1, FuncDecl=2, ClassDecl=3, ImportDecl=4 if we added it there).
        // Let's check ast.ts to be sure of the enum order.
        // Or better, update imports in index.ts to include NodeType.
        resolveImports(program, path.dirname(path.resolve(filePath)));

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
