import * as path from 'path';
import { Program, Statement, NodeType } from '../core/ast';
import { FileResolver } from '../utils/file/FileResolver';
import { Lexer } from '../core/lexer';
import { Parser } from '../parser';
import { logger } from '../utils/logger/Logger';

/**
 * Handles import resolution and merging of multiple source files
 */
export class ImportResolver {
    private fileResolver: FileResolver;

    constructor() {
        this.fileResolver = new FileResolver();
    }

    /**
     * Resolve all imports in a program recursively
     */
    resolveImports(program: Program, baseDir: string): Program {
        logger.debug(`Resolving imports from ${baseDir}`);

        const newBody: Statement[] = [];

        for (const stmt of program.body) {
            if (stmt.kind === NodeType.ImportDeclaration) {
                const importStmt = stmt as any;
                const importPath = importStmt.path;

                try {
                    const fullPath = this.fileResolver.resolve(importPath, baseDir);

                    // Check for circular imports
                    if (this.fileResolver.hasVisited(fullPath)) {
                        logger.warn(`Skipping circular import: ${fullPath}`);
                        continue;
                    }

                    this.fileResolver.markVisited(fullPath);

                    // Parse imported file
                    const importedProgram = this.parseFile(fullPath);

                    // Recursively resolve imports in the imported file
                    const resolvedImport = this.resolveImports(
                        importedProgram,
                        path.dirname(fullPath)
                    );

                    // Merge imported statements
                    newBody.push(...resolvedImport.body);

                    logger.debug(`Imported: ${fullPath}`);
                } catch (error) {
                    logger.error(`Failed to import ${importPath}: ${error}`);
                    throw error;
                }
            } else {
                newBody.push(stmt);
            }
        }

        return {
            ...program,
            body: newBody
        };
    }

    /**
     * Parse a file and return its AST
     */
    private parseFile(filePath: string): Program {
        const source = this.fileResolver.readFile(filePath);
        const lexer = new Lexer(source, filePath);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        return parser.produceAST();
    }

    /**
     * Get all files that were imported
     */
    getImportedFiles(): string[] {
        return this.fileResolver.getVisitedFiles();
    }

    /**
     * Reset the resolver state
     */
    reset(): void {
        this.fileResolver.reset();
    }
}
