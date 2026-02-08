"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORDS = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    // Keywords
    TokenType[TokenType["Let"] = 0] = "Let";
    TokenType[TokenType["If"] = 1] = "If";
    TokenType[TokenType["Else"] = 2] = "Else";
    TokenType[TokenType["While"] = 3] = "While";
    TokenType[TokenType["For"] = 4] = "For";
    TokenType[TokenType["Func"] = 5] = "Func";
    TokenType[TokenType["Return"] = 6] = "Return";
    TokenType[TokenType["Class"] = 7] = "Class";
    TokenType[TokenType["New"] = 8] = "New";
    TokenType[TokenType["This"] = 9] = "This";
    TokenType[TokenType["Switch"] = 10] = "Switch";
    TokenType[TokenType["Case"] = 11] = "Case";
    TokenType[TokenType["Default"] = 12] = "Default";
    TokenType[TokenType["Break"] = 13] = "Break";
    TokenType[TokenType["Continue"] = 14] = "Continue";
    // Literals
    TokenType[TokenType["Identifier"] = 15] = "Identifier";
    TokenType[TokenType["Integer"] = 16] = "Integer";
    TokenType[TokenType["String"] = 17] = "String";
    // Operators
    TokenType[TokenType["Equals"] = 18] = "Equals";
    TokenType[TokenType["Plus"] = 19] = "Plus";
    TokenType[TokenType["Minus"] = 20] = "Minus";
    TokenType[TokenType["Multiply"] = 21] = "Multiply";
    TokenType[TokenType["Divide"] = 22] = "Divide";
    TokenType[TokenType["EqEq"] = 23] = "EqEq";
    TokenType[TokenType["NotEq"] = 24] = "NotEq";
    TokenType[TokenType["Less"] = 25] = "Less";
    TokenType[TokenType["Greater"] = 26] = "Greater";
    TokenType[TokenType["LessEq"] = 27] = "LessEq";
    TokenType[TokenType["GreaterEq"] = 28] = "GreaterEq";
    // Punctuation
    TokenType[TokenType["OpenParen"] = 29] = "OpenParen";
    TokenType[TokenType["CloseParen"] = 30] = "CloseParen";
    TokenType[TokenType["OpenBrace"] = 31] = "OpenBrace";
    TokenType[TokenType["CloseBrace"] = 32] = "CloseBrace";
    TokenType[TokenType["OpenBracket"] = 33] = "OpenBracket";
    TokenType[TokenType["CloseBracket"] = 34] = "CloseBracket";
    TokenType[TokenType["SemiColon"] = 35] = "SemiColon";
    TokenType[TokenType["Comma"] = 36] = "Comma";
    TokenType[TokenType["Dot"] = 37] = "Dot";
    TokenType[TokenType["Colon"] = 38] = "Colon";
    TokenType[TokenType["EOF"] = 39] = "EOF"; // End of File
})(TokenType || (exports.TokenType = TokenType = {}));
exports.KEYWORDS = {
    "let": TokenType.Let,
    "if": TokenType.If,
    "else": TokenType.Else,
    "while": TokenType.While,
    "for": TokenType.For,
    "func": TokenType.Func,
    "return": TokenType.Return,
    "class": TokenType.Class,
    "new": TokenType.New,
    "this": TokenType.This,
    "switch": TokenType.Switch,
    "case": TokenType.Case,
    "default": TokenType.Default,
    "break": TokenType.Break,
    "continue": TokenType.Continue,
};
