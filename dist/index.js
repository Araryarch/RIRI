#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const lexer_1 = require("./lexer");
const parser_1 = require("./parser");
const codegen_1 = require("./codegen");
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
        const tokens = (0, lexer_1.tokenize)(input);
        // 2. Parse
        const parser = new parser_1.Parser(tokens);
        const program = parser.produceAST();
        // 3. Codegen
        const generator = new codegen_1.CodeGenerator(program);
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
            (0, child_process_1.execSync)(`g++ -std=c++20 "${cppFilePath}" -o "${exePath}"`, { stdio: 'inherit' });
        }
        catch (e) {
            console.error("Compilation failed.");
            // Only cleanup if it's a temp run
            if (command === 'run')
                cleanup(cppFilePath, exePath);
            process.exit(1);
        }
        // 7. Run or Build
        if (command === 'run') {
            try {
                (0, child_process_1.execSync)(`"${exePath}"`, { stdio: 'inherit' });
            }
            catch (e) {
                console.error("Execution failed.");
            }
            cleanup(cppFilePath, exePath);
        }
        else if (command === 'build') {
            console.log(`Build successful: ${exePath}`);
            // Keep exe, delete cpp
            if (fs.existsSync(cppFilePath))
                fs.unlinkSync(cppFilePath);
        }
    }
    catch (e) {
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
function cleanup(cFile, exeFile) {
    if (fs.existsSync(cFile))
        fs.unlinkSync(cFile);
    if (fs.existsSync(exeFile))
        fs.unlinkSync(exeFile);
}
main();
