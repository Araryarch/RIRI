import { Token, TokenType, KEYWORDS } from './TokenTypes';
import { LexerError } from '../../utils/errors/CompilerError';
import { logger } from '../../utils/logger/Logger';

/**
 * Lexer class responsible for tokenizing source code
 */
export class Lexer {
    private source: string;
    private tokens: Token[] = [];
    private cursor: number = 0;
    private line: number = 1;
    private column: number = 1;
    private fileName?: string;

    constructor(source: string, fileName?: string) {
        this.source = source;
        this.fileName = fileName;
    }

    /**
     * Tokenize the source code
     */
    tokenize(): Token[] {
        logger.debug(`Tokenizing ${this.fileName || 'source'}`);

        while (this.cursor < this.source.length) {
            this.scanToken();
        }

        this.tokens.push(this.createToken(TokenType.EOF, 'EOF'));
        logger.debug(`Tokenization complete: ${this.tokens.length} tokens`);

        return this.tokens;
    }

    private scanToken(): void {
        const char = this.currentChar();

        // Skip whitespace
        if (this.isWhitespace(char)) {
            this.handleWhitespace();
            return;
        }

        // Numbers
        if (this.isDigit(char)) {
            this.scanNumber();
            return;
        }

        // Identifiers and keywords
        if (this.isAlpha(char)) {
            this.scanIdentifier();
            return;
        }

        // Strings
        if (char === '"') {
            this.scanString();
            return;
        }

        // Comments
        if (char === '/' && this.peek() === '/') {
            this.scanComment();
            return;
        }

        // Operators and punctuation
        this.scanOperator();
    }

    private handleWhitespace(): void {
        const char = this.currentChar();
        if (char === '\n') {
            this.line++;
            this.column = 0;
        }
        this.advance();
    }

    private scanNumber(): void {
        const start = this.cursor;
        const startColumn = this.column;
        let hasDecimal = false;

        while (this.cursor < this.source.length) {
            const char = this.currentChar();

            if (this.isDigit(char)) {
                this.advance();
            } else if (char === '.' && !hasDecimal) {
                hasDecimal = true;
                this.advance();
            } else {
                break;
            }
        }

        const value = this.source.slice(start, this.cursor);
        this.tokens.push(this.createToken(TokenType.Integer, value, startColumn));
    }

    private scanIdentifier(): void {
        const start = this.cursor;
        const startColumn = this.column;

        while (this.cursor < this.source.length && this.isAlphaNumeric(this.currentChar())) {
            this.advance();
        }

        const value = this.source.slice(start, this.cursor);
        const type = KEYWORDS[value] ?? TokenType.Identifier;

        this.tokens.push(this.createToken(type, value, startColumn));
    }

    private scanString(): void {
        const startColumn = this.column;
        this.advance(); // Skip opening quote

        let value = '';

        while (this.cursor < this.source.length) {
            const char = this.currentChar();

            if (char === '"') {
                this.advance(); // Skip closing quote
                break;
            }

            if (char === '\\' && this.cursor + 1 < this.source.length) {
                this.advance();
                value += '\\' + this.currentChar();
                this.advance();
            } else {
                if (char === '\n') {
                    throw new LexerError(
                        'Unterminated string literal',
                        this.line,
                        this.column,
                        this.fileName
                    );
                }
                value += char;
                this.advance();
            }
        }

        this.tokens.push(this.createToken(TokenType.String, value, startColumn));
    }

    private scanComment(): void {
        // Skip until newline
        while (this.cursor < this.source.length && this.currentChar() !== '\n') {
            this.advance();
        }
    }

    private scanOperator(): void {
        const char = this.currentChar();
        const startColumn = this.column;

        // Two-character operators
        if (this.cursor + 1 < this.source.length) {
            const twoChar = char + this.peek();
            const twoCharToken = this.getTwoCharOperator(twoChar);

            if (twoCharToken) {
                this.advance();
                this.advance();
                this.tokens.push(this.createToken(twoCharToken, twoChar, startColumn));
                return;
            }
        }

        // Single-character operators
        const singleCharToken = this.getSingleCharOperator(char);

        if (singleCharToken) {
            this.advance();
            this.tokens.push(this.createToken(singleCharToken, char, startColumn));
        } else {
            throw new LexerError(
                `Unexpected character: '${char}'`,
                this.line,
                this.column,
                this.fileName
            );
        }
    }

    private getTwoCharOperator(op: string): TokenType | null {
        const operators: Record<string, TokenType> = {
            '==': TokenType.EqEq,
            '!=': TokenType.NotEq,
            '<=': TokenType.LessEq,
            '>=': TokenType.GreaterEq,
            '&&': TokenType.And,
            '||': TokenType.Or,
            '=>': TokenType.Arrow,
        };
        return operators[op] ?? null;
    }

    private getSingleCharOperator(char: string): TokenType | null {
        const operators: Record<string, TokenType> = {
            '(': TokenType.OpenParen,
            ')': TokenType.CloseParen,
            '{': TokenType.OpenBrace,
            '}': TokenType.CloseBrace,
            '[': TokenType.OpenBracket,
            ']': TokenType.CloseBracket,
            ';': TokenType.SemiColon,
            ',': TokenType.Comma,
            '.': TokenType.Dot,
            ':': TokenType.Colon,
            '=': TokenType.Equals,
            '+': TokenType.Plus,
            '-': TokenType.Minus,
            '*': TokenType.Multiply,
            '/': TokenType.Divide,
            '%': TokenType.Modulo,
            '<': TokenType.Less,
            '>': TokenType.Greater,
        };
        return operators[char] ?? null;
    }

    // Helper methods
    private currentChar(): string {
        return this.source[this.cursor];
    }

    private peek(offset: number = 1): string {
        return this.source[this.cursor + offset];
    }

    private advance(): void {
        this.cursor++;
        this.column++;
    }

    private isWhitespace(char: string): boolean {
        return /\s/.test(char);
    }

    private isDigit(char: string): boolean {
        return /[0-9]/.test(char);
    }

    private isAlpha(char: string): boolean {
        return /[a-zA-Z_]/.test(char);
    }

    private isAlphaNumeric(char: string): boolean {
        return /[a-zA-Z0-9_]/.test(char);
    }

    private createToken(type: TokenType, value: string, column?: number): Token {
        return {
            type,
            value,
            line: this.line,
            column: column ?? this.column
        };
    }
}
