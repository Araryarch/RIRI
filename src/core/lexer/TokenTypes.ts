/**
 * Token types for the lexer
 */
export enum TokenType {
    // Keywords
    Let,
    If,
    Else,
    While,
    For,
    Func,
    Return,
    Class,
    New,
    This,
    Switch,
    Case,
    Default,
    Break,
    Continue,
    Import,
    Try,
    Catch,
    Finally,
    Async,
    Await,

    // Literals
    Identifier,
    Integer,
    String,

    // Operators
    Equals, // =
    Plus,   // +
    Minus,  // -
    Multiply, // *
    Divide, // /
    Modulo, // %
    EqEq,   // ==
    NotEq,  // !=
    Less,   // <
    Greater, // >
    LessEq, // <=
    GreaterEq, // >=
    And,    // &&
    Or,     // ||

    // Punctuation
    OpenParen, // (
    CloseParen, // )
    OpenBrace, // {
    CloseBrace, // }
    OpenBracket, // [
    CloseBracket, // ]
    SemiColon, // ;
    Comma, // ,
    Dot, // .
    Colon, // :
    Arrow, // =>

    EOF // End of File
}

/**
 * Token interface
 */
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column?: number; // Optional for backward compatibility
}

/**
 * Keyword mappings
 */
export const KEYWORDS: Record<string, TokenType> = {
    "let": TokenType.Let,
    "if": TokenType.If,
    "else": TokenType.Else,
    "while": TokenType.While,
    "for": TokenType.For,
    "func": TokenType.Func,
    "fn": TokenType.Func,
    "return": TokenType.Return,
    "class": TokenType.Class,
    "new": TokenType.New,
    "this": TokenType.This,
    "switch": TokenType.Switch,
    "case": TokenType.Case,
    "default": TokenType.Default,
    "break": TokenType.Break,
    "continue": TokenType.Continue,
    "import": TokenType.Import,
    "try": TokenType.Try,
    "catch": TokenType.Catch,
    "finally": TokenType.Finally,
    "async": TokenType.Async,
    "await": TokenType.Await,
};
