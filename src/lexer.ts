
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
            let str = "";
            cursor++;
            while (cursor < source.length) {
                if (source[cursor] === '"') {
                    cursor++;
                    break;
                }
                if (source[cursor] === '\\' && cursor + 1 < source.length) {
                    cursor++; // Skip backslash
                    // Handle specific escapes if needed, for now just literal
                    // e.g. \n, \t. C++ might handle them if we pass them raw?
                    // But here we are building a string value.
                    // If we pass `\"` to C++, we want `\"` in the string literal?
                    // Or we want `"` in the value?
                    // Codegen wrap: `std::string("` + value + `")`.
                    // If value contains `"`, C++ string breaks.
                    // So we must ESCAPE double quotes in codegen or kept escaped here.

                    // Let's keep the escape sequence AS IS in the value for now?
                    // If source is `\"`, value becomes `\"`.
                    // Then codegen writes `std::string("\"")`. Correct.
                    str += '\\' + source[cursor];
                } else {
                    str += source[cursor];
                }
                cursor++;
            }
            tokens.push({ type: TokenType.String, value: str, line });
            continue;
        }

        // 5. Comments (Single line)
        if (char === '/' && cursor + 1 < source.length && source[cursor + 1] === '/') {
            // Skip until newline
            cursor += 2;
            while (cursor < source.length && source[cursor] !== '\n') {
                cursor++;
            }
            continue;
        }

        // 6. Operators & Punctuation
        // Handle '=' related operators first
        if (char === '=') {
            // Check for ==
            if (cursor + 1 < source.length && source[cursor + 1] === '=') {
                tokens.push({ type: TokenType.EqEq, value: "==", line });
                cursor += 2;
                continue;
            }
            // Check for =>
            if (cursor + 1 < source.length && source[cursor + 1] === '>') {
                tokens.push({ type: TokenType.Arrow, value: "=>", line });
                cursor += 2;
                continue;
            }
            tokens.push({ type: TokenType.Equals, value: "=", line });
            cursor++;
            continue;
        }

        // Check other two-char operators
        const twoChars = source.slice(cursor, cursor + 2);
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
        if (twoChars === "&&") {
            tokens.push({ type: TokenType.And, value: "&&", line });
            cursor += 2;
            continue;
        }
        if (twoChars === "||") {
            tokens.push({ type: TokenType.Or, value: "||", line });
            cursor += 2;
            continue;
        }
        if (twoChars === "=>") {
            tokens.push({ type: TokenType.Arrow, value: "=>", line });
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
            case '?': tokens.push({ type: TokenType.Question, value: "?", line }); break;
            default:
                console.error(`Unexpected character: '${char}' at line ${line}`);
                process.exit(1);
        }
        cursor++;
    }

    tokens.push({ type: TokenType.EOF, value: "EOF", line });
    return tokens;
}
