import * as fs from 'fs';
import * as path from 'path';
import { ImportError } from '../errors/CompilerError';
import { logger } from '../logger/Logger';

/**
 * Handles file resolution and import management
 */
export class FileResolver {
    private visitedFiles: Set<string> = new Set();

    /**
     * Resolve a file path relative to a base directory
     */
    resolve(importPath: string, baseDir: string): string {
        const fullPath = path.resolve(baseDir, importPath);

        if (!fs.existsSync(fullPath)) {
            throw new ImportError(
                `Cannot find module '${importPath}'`,
                importPath,
                baseDir
            );
        }

        return fullPath;
    }

    /**
     * Read file contents
     */
    readFile(filePath: string): string {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            throw new ImportError(
                `Failed to read file: ${error}`,
                filePath
            );
        }
    }

    /**
     * Check if a file has been visited (for circular import detection)
     */
    hasVisited(filePath: string): boolean {
        const resolved = path.resolve(filePath);
        return this.visitedFiles.has(resolved);
    }

    /**
     * Mark a file as visited
     */
    markVisited(filePath: string): void {
        const resolved = path.resolve(filePath);
        this.visitedFiles.add(resolved);
        logger.debug(`Marked as visited: ${resolved}`);
    }

    /**
     * Reset visited files (useful for testing)
     */
    reset(): void {
        this.visitedFiles.clear();
    }

    /**
     * Get all visited files
     */
    getVisitedFiles(): string[] {
        return Array.from(this.visitedFiles);
    }
}
