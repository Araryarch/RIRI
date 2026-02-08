import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Lexer } from '../core/lexer';
import { Parser } from '../parser';
import { CodeGenerator } from '../codegen';
import { ImportResolver } from './ImportResolver';
import { logger } from '../utils/logger/Logger';
import { CompilerError } from '../utils/errors/CompilerError';

/**
 * Compiler options
 */
export interface CompilerOptions {
    qt?: boolean;
    outputDir?: string;
    keepCpp?: boolean;
    optimize?: boolean;
}

/**
 * Compilation result
 */
export interface CompilationResult {
    success: boolean;
    cppFile?: string;
    executable?: string;
    cppCode?: string;
    error?: Error;
}

/**
 * Main compiler class that orchestrates the compilation process
 */
export class Compiler {
    private options: CompilerOptions;
    private importResolver: ImportResolver;

    constructor(options: CompilerOptions = {}) {
        this.options = {
            optimize: true,
            keepCpp: false,
            ...options
        };
        this.importResolver = new ImportResolver();
    }

    /**
     * Compile a source file
     */
    async compile(filePath: string): Promise<CompilationResult> {
        try {
            logger.info(`Compiling ${filePath}...`);

            // 1. Read source file
            const source = fs.readFileSync(filePath, 'utf-8');

            // 2. Lexical analysis
            logger.debug('Lexical analysis...');
            const lexer = new Lexer(source, filePath);
            const tokens = lexer.tokenize();

            // 3. Parsing
            logger.debug('Parsing...');
            const parser = new Parser(tokens);
            let program = parser.produceAST();

            // 4. Import resolution
            logger.debug('Resolving imports...');
            this.importResolver.reset();
            this.importResolver.getImportedFiles(); // Mark main file as visited
            program = this.importResolver.resolveImports(
                program,
                path.dirname(path.resolve(filePath))
            );

            // 5. Code generation
            logger.debug('Generating C++ code...');
            const generator = new CodeGenerator(program, { qt: this.options.qt });
            const cppCode = generator.generate();

            // 6. Write C++ file
            const fileName = path.basename(filePath, path.extname(filePath));
            const outputDir = this.options.outputDir || path.dirname(filePath);
            const cppFile = path.join(outputDir, `${fileName}.cpp`);
            const executable = path.join(outputDir, fileName);

            fs.writeFileSync(cppFile, cppCode);
            logger.debug(`C++ code written to ${cppFile}`);

            // 7. Compile C++ code
            logger.debug('Compiling C++ code...');
            await this.compileCpp(cppFile, executable);

            logger.success(`Compilation successful: ${executable}`);

            // 8. Cleanup if needed
            if (!this.options.keepCpp) {
                fs.unlinkSync(cppFile);
                logger.debug(`Removed temporary C++ file: ${cppFile}`);
            }

            return {
                success: true,
                cppFile: this.options.keepCpp ? cppFile : undefined,
                executable,
                cppCode
            };

        } catch (error) {
            logger.error(`Compilation failed: ${error}`);
            return {
                success: false,
                error: error as Error
            };
        }
    }

    /**
     * Generate C++ code without compiling
     */
    generateCpp(filePath: string): string {
        try {
            const source = fs.readFileSync(filePath, 'utf-8');
            const lexer = new Lexer(source, filePath);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            let program = parser.produceAST();

            this.importResolver.reset();
            program = this.importResolver.resolveImports(
                program,
                path.dirname(path.resolve(filePath))
            );

            const generator = new CodeGenerator(program, { qt: this.options.qt });
            return generator.generate();
        } catch (error) {
            logger.error(`Failed to generate C++ code: ${error}`);
            throw error;
        }
    }

    /**
     * Compile C++ code to executable
     */
    private async compileCpp(cppFile: string, outputFile: string): Promise<void> {
        // Check for g++
        try {
            execSync('g++ --version', { stdio: 'ignore' });
        } catch (e) {
            throw new CompilerError(
                "g++ compiler not found. Please install g++ to compile RiriLang programs."
            );
        }

        // Build compile command
        let qtFlags = '';
        if (this.options.qt) {
            try {
                qtFlags = execSync('pkg-config --cflags --libs Qt6Widgets Qt6Core Qt6Gui', {
                    stdio: 'pipe'
                }).toString().trim();
                logger.debug(`Qt flags: ${qtFlags}`);
            } catch (e) {
                logger.warn('Qt libraries not found. Compilation may fail if Qt features are used.');
            }
        }

        const optimizationFlag = this.options.optimize ? '-O3' : '-O0';
        const includeDir = path.join(__dirname, '..', 'include');

        const compileCmd = `g++ -std=c++20 ${optimizationFlag} -I "${includeDir}" "${cppFile}" -o "${outputFile}" -lpthread ${qtFlags}`;

        logger.debug(`Compile command: ${compileCmd}`);

        try {
            execSync(compileCmd, { stdio: 'inherit' });
        } catch (e) {
            throw new CompilerError('C++ compilation failed');
        }
    }

    /**
     * Run a compiled executable
     */
    async run(executablePath: string): Promise<void> {
        try {
            logger.info(`Running ${executablePath}...`);
            execSync(`"${executablePath}"`, { stdio: 'inherit' });
        } catch (e) {
            throw new CompilerError(`Execution failed: ${e}`);
        }
    }
}
