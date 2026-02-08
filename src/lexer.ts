
import { Token, TokenType, KEYWORDS } from "./tokens";

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;
    let line = 1;

    while (cursor < source.length) {
        const char = source[cursor];

        // 1. Skip Whitespace
        if (/\s/.test(char)) {
            if (char === '\n') line++;
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
            tokens.push({ type: TokenType.Integer, value: numStr, line });
            continue;
        }

        // 3. Identifiers & Keywords
        if (/[a-zA-Z_]/.test(char)) {
            let ident = "";
            while (cursor < source.length && /[a-zA-Z0-9_]/.test(source[cursor])) {
                ident += source[cursor];
                cursor++;
            }
            const type = KEYWORDS[ident] ?? TokenType.Identifier;
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
            tokens.push({ type: TokenType.String, value: str, line });
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
            tokens.push({ type: TokenType.EqEq, value: "==", line });
            cursor += 2;
            continue;
        }
        if (twoChars === "!=") {
            tokens.push({ type: TokenType.NotEq, value: "!=", line });
            cursor += 2;
            continue;
        }
        if (twoChars === "<=") {
            tokens.push({ type: TokenType.LessEq, value: "<=", line });
            cursor += 2;
            continue;
        }
        if (twoChars === ">=") {
            tokens.push({ type: TokenType.GreaterEq, value: ">=", line });
            cursor += 2;
            continue;
        }

        // Single-char tokens
        switch (char) {
            case '(': tokens.push({ type: TokenType.OpenParen, value: "(", line }); break;
            case ')': tokens.push({ type: TokenType.CloseParen, value: ")", line }); break;
            case '{': tokens.push({ type: TokenType.OpenBrace, value: "{", line }); break;
            case '}': tokens.push({ type: TokenType.CloseBrace, value: "}", line }); break;
            case '[': tokens.push({ type: TokenType.OpenBracket, value: "[", line }); break;
            case ']': tokens.push({ type: TokenType.CloseBracket, value: "]", line }); break;
            case ';': tokens.push({ type: TokenType.SemiColon, value: ";", line }); break;
            case ',': tokens.push({ type: TokenType.Comma, value: ",", line }); break;
            case '.': tokens.push({ type: TokenType.Dot, value: ".", line }); break;
            case ':': tokens.push({ type: TokenType.Colon, value: ":", line }); break;
            case '=': tokens.push({ type: TokenType.Equals, value: "=", line }); break;
            case '+': tokens.push({ type: TokenType.Plus, value: "+", line }); break;
            case '-': tokens.push({ type: TokenType.Minus, value: "-", line }); break;
            case '*': tokens.push({ type: TokenType.Multiply, value: "*", line }); break;
            case '/': tokens.push({ type: TokenType.Divide, value: "/", line }); break;
            case '%': tokens.push({ type: TokenType.Modulo, value: "%", line }); break;
            case '<': tokens.push({ type: TokenType.Less, value: "<", line }); break;
            case '>': tokens.push({ type: TokenType.Greater, value: ">", line }); break;
            default:
                console.error(`Unexpected character: '${char}' at line ${line}`);
                process.exit(1);
        }
        cursor++;
    }

    tokens.push({ type: TokenType.EOF, value: "EOF", line });
    return tokens;
}
