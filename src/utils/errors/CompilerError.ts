/**
 * Base class for all compiler errors
 */
export class CompilerError extends Error {
    constructor(
        message: string,
        public readonly line?: number,
        public readonly column?: number,
        public readonly file?: string
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    toString(): string {
        const location = this.file
            ? `${this.file}:${this.line ?? '?'}:${this.column ?? '?'}`
            : `line ${this.line ?? '?'}`;

        return `${this.name} at ${location}: ${this.message}`;
    }
}

/**
 * Lexer-specific errors
 */
export class LexerError extends CompilerError {
    constructor(message: string, line: number, column?: number, file?: string) {
        super(message, line, column, file);
    }
}

/**
 * Parser-specific errors
 */
export class ParserError extends CompilerError {
    constructor(message: string, line?: number, column?: number, file?: string) {
        super(message, line, column, file);
    }
}

/**
 * Code generation errors
 */
export class CodeGenError extends CompilerError {
    constructor(message: string, line?: number, column?: number, file?: string) {
        super(message, line, column, file);
    }
}

/**
 * Import resolution errors
 */
export class ImportError extends CompilerError {
    constructor(message: string, public readonly importPath: string, file?: string) {
        super(message, undefined, undefined, file);
    }
}
