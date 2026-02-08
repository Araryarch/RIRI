"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenize = tokenize;
const tokens_1 = require("./tokens");
function tokenize(source) {
    var _a;
    const tokens = [];
    let cursor = 0;
    let line = 1;
    while (cursor < source.length) {
        const char = source[cursor];
        // 1. Skip Whitespace
        if (/\s/.test(char)) {
            if (char === '\n')
                line++;
            cursor++;
            continue;
        }
        // 2. Numbers
        if (/[0-9]/.test(char)) {
            let numStr = "";
            let hasDecimal = false;
            while (cursor < source.length && (/[0-9]/.test(source[cursor]) || source[cursor] === '.')) {
                if (source[cursor] === '.') {
                    if (hasDecimal) {
                        // Second dot found, stop parsing number
                        break;
                    }
                    hasDecimal = true;
                }
                numStr += source[cursor];
                cursor++;
            }
            // If it has a decimal, it's a Float, otherwise Integer.
            // The original comment said to call it Integer even if it holds a float string,
            // but it's better to distinguish if possible. Let's use Integer for now as per the original.
            tokens.push({ type: tokens_1.TokenType.Integer, value: numStr, line });
            continue;
        }
        // 3. Identifiers & Keywords
        if (/[a-zA-Z_]/.test(char)) {
            let ident = "";
            while (cursor < source.length && /[a-zA-Z0-9_]/.test(source[cursor])) {
                ident += source[cursor];
                cursor++;
            }
            const type = (_a = tokens_1.KEYWORDS[ident]) !== null && _a !== void 0 ? _a : tokens_1.TokenType.Identifier;
            tokens.push({ type, value: ident, line });
            continue;
        }
        // 4. Strings
        if (char === '"') {
            cursor++; // Skip opening quote
            let str = "";
            while (cursor < source.length && source[cursor] !== '"') {
                str += source[cursor];
                cursor++;
            }
            cursor++; // Skip closing quote
            tokens.push({ type: tokens_1.TokenType.String, value: str, line });
            continue;
        }
        // 5. Operators & Punctuation
        // Check two-char operators first
        const twoChars = source.slice(cursor, cursor + 2);
        if (twoChars === "//") {
            while (cursor < source.length && source[cursor] !== '\n') {
                cursor++;
            }
            continue;
        }
        if (twoChars === "==") {
            tokens.push({ type: tokens_1.TokenType.EqEq, value: "==", line });
            cursor += 2;
            continue;
        }
        if (twoChars === "!=") {
            tokens.push({ type: tokens_1.TokenType.NotEq, value: "!=", line });
            cursor += 2;
            continue;
        }
        if (twoChars === "<=") {
            tokens.push({ type: tokens_1.TokenType.LessEq, value: "<=", line });
            cursor += 2;
            continue;
        }
        if (twoChars === ">=") {
            tokens.push({ type: tokens_1.TokenType.GreaterEq, value: ">=", line });
            cursor += 2;
            continue;
        }
        // Single-char tokens
        switch (char) {
            case '(':
                tokens.push({ type: tokens_1.TokenType.OpenParen, value: "(", line });
                break;
            case ')':
                tokens.push({ type: tokens_1.TokenType.CloseParen, value: ")", line });
                break;
            case '{':
                tokens.push({ type: tokens_1.TokenType.OpenBrace, value: "{", line });
                break;
            case '}':
                tokens.push({ type: tokens_1.TokenType.CloseBrace, value: "}", line });
                break;
            case '[':
                tokens.push({ type: tokens_1.TokenType.OpenBracket, value: "[", line });
                break;
            case ']':
                tokens.push({ type: tokens_1.TokenType.CloseBracket, value: "]", line });
                break;
            case ';':
                tokens.push({ type: tokens_1.TokenType.SemiColon, value: ";", line });
                break;
            case ',':
                tokens.push({ type: tokens_1.TokenType.Comma, value: ",", line });
                break;
            case '.':
                tokens.push({ type: tokens_1.TokenType.Dot, value: ".", line });
                break;
            case ':':
                tokens.push({ type: tokens_1.TokenType.Colon, value: ":", line });
                break;
            case '=':
                tokens.push({ type: tokens_1.TokenType.Equals, value: "=", line });
                break;
            case '+':
                tokens.push({ type: tokens_1.TokenType.Plus, value: "+", line });
                break;
            case '-':
                tokens.push({ type: tokens_1.TokenType.Minus, value: "-", line });
                break;
            case '*':
                tokens.push({ type: tokens_1.TokenType.Multiply, value: "*", line });
                break;
            case '/':
                tokens.push({ type: tokens_1.TokenType.Divide, value: "/", line });
                break;
            case '<':
                tokens.push({ type: tokens_1.TokenType.Less, value: "<", line });
                break;
            case '>':
                tokens.push({ type: tokens_1.TokenType.Greater, value: ">", line });
                break;
            default:
                console.error(`Unexpected character: '${char}' at line ${line}`);
                process.exit(1);
        }
        cursor++;
    }
    tokens.push({ type: tokens_1.TokenType.EOF, value: "EOF", line });
    return tokens;
}
