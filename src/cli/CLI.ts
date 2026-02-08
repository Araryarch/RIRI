#!/usr/bin/env node
import * as fs from 'fs';
import { Compiler } from '../compiler/Compiler';
import { logger, LogLevel } from '../utils/logger/Logger';

/**
 * Command-line interface for RiriLang compiler
 */
export class CLI {
    private args: string[];

    constructor(args: string[]) {
        this.args = args;
    }

    /**
     * Run the CLI
     */
    async run(): Promise<void> {
        if (this.args.length < 1) {
            this.printUsage();
            process.exit(1);
        }

        const command = this.args[0];

        // Handle special commands
        if (command === '--help' || command === '-h') {
            this.printUsage();
            process.exit(0);
        }

        if (command === '--version' || command === '-v') {
            this.printVersion();
            process.exit(0);
        }

        if (command === 'test') {
            await this.runTests();
            return;
        }

        // Handle compilation commands
        const filePath = this.args[1];

        if (!filePath) {
            logger.error('No input file specified');
            this.printUsage();
            process.exit(1);
        }

        if (!fs.existsSync(filePath)) {
            logger.error(`File not found: ${filePath}`);
            process.exit(1);
        }

        // Parse flags
        const useQt = this.args.includes('--qt');
        const verbose = this.args.includes('--verbose') || this.args.includes('-v');
        const keepCpp = this.args.includes('--keep-cpp');

        if (verbose) {
            logger.setLevel(LogLevel.DEBUG);
        }

        const compiler = new Compiler({
            qt: useQt,
            keepCpp: keepCpp || command === 'build'
        });

        try {
            switch (command) {
                case 'run':
                    await this.runCommand(compiler, filePath);
                    break;
                case 'build':
                    await this.buildCommand(compiler, filePath);
                    break;
                case 'show':
                    await this.showCommand(compiler, filePath);
                    break;
                default:
                    logger.error(`Unknown command: ${command}`);
                    this.printUsage();
                    process.exit(1);
            }
        } catch (error) {
            logger.error(`Command failed: ${error}`);
            process.exit(1);
        }
    }

    /**
     * Run command: compile and execute
     */
    private async runCommand(compiler: Compiler, filePath: string): Promise<void> {
        const result = await compiler.compile(filePath);

        if (!result.success) {
            logger.error('Compilation failed');
            process.exit(1);
        }

        if (result.executable) {
            await compiler.run(result.executable);

            // Cleanup
            if (fs.existsSync(result.executable)) {
                fs.unlinkSync(result.executable);
            }
        }
    }

    /**
     * Build command: compile to executable
     */
    private async buildCommand(compiler: Compiler, filePath: string): Promise<void> {
        const result = await compiler.compile(filePath);

        if (!result.success) {
            logger.error('Build failed');
            process.exit(1);
        }

        logger.success(`Build successful: ${result.executable}`);
    }

    /**
     * Show command: display generated C++ code
     */
    private async showCommand(compiler: Compiler, filePath: string): Promise<void> {
        const cppCode = compiler.generateCpp(filePath);
        console.log(cppCode);
    }

    /**
     * Run tests
     */
    private async runTests(): Promise<void> {
        const { runTests } = require('../testing');
        const targetDir = this.args[1] || 'tests';
        runTests(targetDir);
    }

    /**
     * Print usage information
     */
    private printUsage(): void {
        console.log(`
RiriLang Compiler v1.0.0

Usage:
  rrc <command> <file> [options]

Commands:
  run <file>      Compile and run the program
  build <file>    Compile to executable
  show <file>     Show generated C++ code
  test [dir]      Run tests from directory (default: tests/)

Options:
  --qt            Enable Qt support
  --keep-cpp      Keep generated C++ file
  --verbose, -v   Enable verbose output
  --help, -h      Show this help message
  --version       Show version information

Examples:
  rrc run main.rr
  rrc build main.rr --qt
  rrc show main.rr
  rrc test
        `);
    }

    /**
     * Print version information
     */
    private printVersion(): void {
        console.log('RiriLang v1.0.0');
        console.log('A modern programming language that compiles to C++');
    }
}
