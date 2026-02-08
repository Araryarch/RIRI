"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const ast_1 = require("./ast");
const tokens_1 = require("./tokens");
class Parser {
    constructor(tokens) {
        this.position = 0;
        this.tokens = tokens;
    }
    produceAST() {
        const program = {
            kind: ast_1.NodeType.Program,
            body: []
        };
        while (this.notEOF()) {
            program.body.push(this.parseStatement());
        }
        return program;
    }
    notEOF() {
        return this.tokens[this.position].type !== tokens_1.TokenType.EOF;
    }
    at() {
        return this.tokens[this.position];
    }
    eat() {
        const prev = this.tokens[this.position];
        this.position++;
        return prev;
    }
    expect(type, err) {
        const prev = this.tokens[this.position];
        if (!prev || prev.type !== type) {
            console.error("Parser Error:\n", err, prev, "Expected:", type);
            process.exit(1);
        }
        this.position++;
        return prev;
    }
    // --- Statements ---
    parseStatement() {
        switch (this.at().type) {
            case tokens_1.TokenType.Let:
                return this.parseVarDeclaration();
            case tokens_1.TokenType.Func:
                return this.parseFnDeclaration();
            case tokens_1.TokenType.Return:
                return this.parseReturnStatement();
            case tokens_1.TokenType.If:
                return this.parseIfStatement();
            case tokens_1.TokenType.While:
                return this.parseWhileStatement();
            case tokens_1.TokenType.For:
                return this.parseForStatement();
            case tokens_1.TokenType.Class:
                return this.parseClassDeclaration();
            case tokens_1.TokenType.Switch:
                return this.parseSwitchStatement();
            case tokens_1.TokenType.Break:
                this.eat();
                this.expect(tokens_1.TokenType.SemiColon, "Expected ; after break");
                // For now, treat break as a simple expression statement or we need a proper BreakStatement node?
                // Plan didn't specify BreakStatement node.
                // But CodeGenerator handles `ExpressionStatement`.
                // `break` is not an expression.
                // Let's add hack: emit raw C string? No.
                // Let's treat it as ExpressionStatement? No, `break` keyword isn't expression.
                // We need BreakStatement in AST or just handle it here.
                // Since I didn't add BreakStatement to AST, let's skip AST update and just make it an "ExpressionStatement" 
                // where expression is a special Identifier "break"? 
                // Or better, let's just add it to AST properly later.
                // For now, let's assume user uses `break` only in Switch/Loop and we map it?
                // Let's fallback to `parseExprStatement` but `break` expects expression.
                // Ok, I need to add `BreakStatement` to AST.
                // I will pause this specific change for a moment and update AST for Break/Continue.
                return { kind: ast_1.NodeType.BreakStatement };
            default:
                return this.parseExprStatement();
        }
    }
    parseVarDeclaration() {
        this.eat(); // eat 'let'
        const identifier = this.expect(tokens_1.TokenType.Identifier, "Expected identifier name following let keywoard.").value;
        if (this.at().type === tokens_1.TokenType.SemiColon) {
            this.eat(); // eat ;
            return { kind: ast_1.NodeType.VariableDeclaration, identifier, value: undefined };
        }
        this.expect(tokens_1.TokenType.Equals, "Expected equals token following identifier in let declaration.");
        const declaration = {
            kind: ast_1.NodeType.VariableDeclaration,
            value: this.parseExpression(),
            identifier,
        };
        this.expect(tokens_1.TokenType.SemiColon, "Variable declaration statment must end with semicolon.");
        return declaration;
    }
    parseFnDeclaration() {
        this.eat(); // eat 'func'
        const name = this.expect(tokens_1.TokenType.Identifier, "Expected function name following func keyword.").value;
        const args = this.parseArgs();
        const params = [];
        for (const arg of args) {
            if (arg.kind !== ast_1.NodeType.Identifier) {
                throw "Function parameters must be identifiers";
            }
            params.push(arg.symbol);
        }
        this.expect(tokens_1.TokenType.OpenBrace, "Expected function body following declaration.");
        const body = [];
        while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(tokens_1.TokenType.CloseBrace, "Closing brace expected inside function declaration");
        return { kind: ast_1.NodeType.FunctionDeclaration, body, name, params };
    }
    parseReturnStatement() {
        this.eat(); // eat 'return'
        const value = this.parseExpression();
        this.expect(tokens_1.TokenType.SemiColon, "Expected semicolon after return statement.");
        return { kind: ast_1.NodeType.ReturnStatement, value };
    }
    parseIfStatement() {
        this.eat(); // eat 'if'
        this.expect(tokens_1.TokenType.OpenParen, "Expected open paren after if");
        const condition = this.parseExpression();
        this.expect(tokens_1.TokenType.CloseParen, "Expected close paren after condition");
        this.expect(tokens_1.TokenType.OpenBrace, "Expected brace after if condition");
        const thenBranch = [];
        while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
            thenBranch.push(this.parseStatement());
        }
        this.expect(tokens_1.TokenType.CloseBrace, "Expected closing brace for if block");
        let elseBranch;
        if (this.at().type === tokens_1.TokenType.Else) {
            this.eat();
            this.expect(tokens_1.TokenType.OpenBrace, "Expected brace after else keyword");
            elseBranch = [];
            while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
                elseBranch.push(this.parseStatement());
            }
            this.expect(tokens_1.TokenType.CloseBrace, "Expected closing brace for else block");
        }
        return { kind: ast_1.NodeType.IfStatement, condition, thenBranch, elseBranch };
    }
    parseWhileStatement() {
        this.eat(); // eat 'while'
        this.expect(tokens_1.TokenType.OpenParen, "Expected open paren after while");
        const condition = this.parseExpression();
        this.expect(tokens_1.TokenType.CloseParen, "Expected close paren after condition");
        this.expect(tokens_1.TokenType.OpenBrace, "Expected brace after while condition");
        const body = [];
        while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(tokens_1.TokenType.CloseBrace, "Expected closing brace for while block");
        return { kind: ast_1.NodeType.WhileStatement, condition, body };
    }
    parseSwitchStatement() {
        this.eat(); // eat switch
        this.expect(tokens_1.TokenType.OpenParen, "Expected ( after switch");
        const discriminant = this.parseExpression();
        this.expect(tokens_1.TokenType.CloseParen, "Expected ) after switch condition");
        this.expect(tokens_1.TokenType.OpenBrace, "Expected { after switch condition");
        const cases = [];
        let defaultCase;
        while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
            if (this.at().type === tokens_1.TokenType.Case) {
                this.eat();
                const test = this.parseExpression();
                this.expect(tokens_1.TokenType.Colon, "Expected : after case value");
                const consequent = [];
                // Parse statements until break, case, default, or }
                // Actually C-style switch falls through. We capture statements until next case/default/end.
                // ALSO handles block scope { ... } if user puts it.
                // The current parseStatement() handles BlockStatement? No, we don't have BlockStatement yet.
                // We have parseStatement which can be many things.
                // If the user wrote `case 1: { ... }`, `parseStatement` might need to handle `{`?
                // Currently `parseStatement` does NOT handle `{` (OpenBrace).
                // We need to add a "BlockStatement" or just handle `{` inside parseStatement to return a list?
                // Or easier: inside here, if we see `{`, we parse it as a sequence of statements.
                if (this.at().type === tokens_1.TokenType.OpenBrace) {
                    this.eat(); // eat {
                    while (this.at().type !== tokens_1.TokenType.CloseBrace && this.at().type !== tokens_1.TokenType.EOF) {
                        consequent.push(this.parseStatement());
                    }
                    this.expect(tokens_1.TokenType.CloseBrace, "Expected } after case block");
                }
                else {
                    while (this.at().type !== tokens_1.TokenType.Case &&
                        this.at().type !== tokens_1.TokenType.Default &&
                        this.at().type !== tokens_1.TokenType.CloseBrace &&
                        this.at().type !== tokens_1.TokenType.EOF) {
                        consequent.push(this.parseStatement());
                    }
                }
                cases.push({ test, consequent });
            }
            else if (this.at().type === tokens_1.TokenType.Default) {
                this.eat();
                this.expect(tokens_1.TokenType.Colon, "Expected : after default");
                const consequent = [];
                if (this.at().type === tokens_1.TokenType.OpenBrace) {
                    this.eat(); // eat {
                    while (this.at().type !== tokens_1.TokenType.CloseBrace && this.at().type !== tokens_1.TokenType.EOF) {
                        consequent.push(this.parseStatement());
                    }
                    this.expect(tokens_1.TokenType.CloseBrace, "Expected } after default block");
                }
                else {
                    while (this.at().type !== tokens_1.TokenType.Case &&
                        this.at().type !== tokens_1.TokenType.Default &&
                        this.at().type !== tokens_1.TokenType.CloseBrace &&
                        this.at().type !== tokens_1.TokenType.EOF) {
                        consequent.push(this.parseStatement());
                    }
                }
                defaultCase = consequent;
            }
            else {
                // Comments or empty lines handled by lexer/parser loop hopefully?
                // If we hit something else inside switch block that isn't case/default, it's an error?
                // Or maybe dead code?
                console.error("Unexpected token inside switch", this.at());
                this.eat(); // Skip to avoid loop
            }
        }
        this.expect(tokens_1.TokenType.CloseBrace, "Expected } after switch body");
        return { kind: ast_1.NodeType.SwitchStatement, discriminant, cases, defaultCase };
    }
    parseForStatement() {
        // for (let i = 0; i < 10; i = i + 1) { ... }
        this.eat(); // eat 'for'
        this.expect(tokens_1.TokenType.OpenParen, "Expected open paren after for");
        // Init
        let init;
        if (this.at().type !== tokens_1.TokenType.SemiColon) {
            init = this.parseStatement(); // usually a var decl or expr stmt
            // parseStatement consumes the semicolon for var decl
            // If it was an expression statement, we need to check if semicolon was consumed.
            // But let's assume standard for-loop structure: init is a statement (likely var decl).
            // Standard parser logic: `parseVarDeclaration` consumes semicolon.
        }
        else {
            this.eat(); // empty init
        }
        // Condition
        let condition;
        if (this.at().type !== tokens_1.TokenType.SemiColon) {
            condition = this.parseExpression();
        }
        this.expect(tokens_1.TokenType.SemiColon, "Expected semicolon after loop condition");
        // Update
        let update;
        if (this.at().type !== tokens_1.TokenType.CloseParen) {
            update = this.parseExpression();
        }
        this.expect(tokens_1.TokenType.CloseParen, "Expected close paren after loop update");
        this.expect(tokens_1.TokenType.OpenBrace, "Expected brace after for loop header");
        const body = [];
        while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(tokens_1.TokenType.CloseBrace, "Expected closing brace for for loop");
        return { kind: ast_1.NodeType.ForStatement, init, condition, update, body };
    }
    parseClassDeclaration() {
        this.eat(); // eat class
        const name = this.expect(tokens_1.TokenType.Identifier, "Expected class name.").value;
        this.expect(tokens_1.TokenType.OpenBrace, "Expected open brace after class name.");
        const methods = [];
        const fields = [];
        while (this.at().type !== tokens_1.TokenType.EOF && this.at().type !== tokens_1.TokenType.CloseBrace) {
            if (this.at().type === tokens_1.TokenType.Func) {
                const func = this.parseFnDeclaration();
                methods.push(func);
            }
            else if (this.at().type === tokens_1.TokenType.Let) {
                const field = this.parseVarDeclaration();
                fields.push(field);
            }
            else {
                // Allow raw identifiers as fields? simpler to enforce 'let' for now or just 'identifier;'?
                // Let's stick to 'let' for fields to be consistent with var decl, or just identifier.
                // For C++ mapping, fields are usually 'Type name;'. In Riri, 'let x = 1;'
                // Let's stick to 'let' for now.
                this.eat(); // Skip unknown token to avoid infinite loop if error
            }
        }
        this.expect(tokens_1.TokenType.CloseBrace, "Expected closing brace for class declaration.");
        return { kind: ast_1.NodeType.ClassDeclaration, name, methods, fields };
    }
    parseExprStatement() {
        const expr = this.parseExpression();
        this.expect(tokens_1.TokenType.SemiColon, "Expected semicolon after expression.");
        return { kind: ast_1.NodeType.ExpressionStatement, expression: expr };
    }
    // --- Expressions ---
    parseExpression() {
        return this.parseAssignmentExpr();
    }
    parseAssignmentExpr() {
        const left = this.parseComparisonExpr();
        if (this.at().type === tokens_1.TokenType.Equals) {
            this.eat(); // advance past equals
            const value = this.parseAssignmentExpr();
            return { value: value, assigne: left, kind: ast_1.NodeType.BinaryExpression, left, right: value, operator: "=" };
        }
        return left;
    }
    parseComparisonExpr() {
        let left = this.parseAdditiveExpr();
        while (this.at().type === tokens_1.TokenType.EqEq ||
            this.at().type === tokens_1.TokenType.NotEq ||
            this.at().type === tokens_1.TokenType.Less ||
            this.at().type === tokens_1.TokenType.Greater ||
            this.at().type === tokens_1.TokenType.LessEq ||
            this.at().type === tokens_1.TokenType.GreaterEq) {
            const operator = this.eat().value;
            const right = this.parseAdditiveExpr();
            left = {
                kind: ast_1.NodeType.BinaryExpression,
                left,
                right,
                operator,
            };
        }
        return left;
    }
    parseAdditiveExpr() {
        let left = this.parseMultiplicitaveExpr();
        while (this.at().value == "+" || this.at().value == "-") {
            const operator = this.eat().value;
            const right = this.parseMultiplicitaveExpr();
            left = {
                kind: ast_1.NodeType.BinaryExpression,
                left,
                right,
                operator,
            };
        }
        return left;
    }
    parseMultiplicitaveExpr() {
        let left = this.parseCallMemberExpr();
        while (this.at().value == "/" || this.at().value == "*") {
            const operator = this.eat().value;
            const right = this.parseCallMemberExpr();
            left = {
                kind: ast_1.NodeType.BinaryExpression,
                left,
                right,
                operator,
            };
        }
        return left;
    }
    parseCallMemberExpr() {
        const member = this.parseMemberExpr(); // Changed from parsePrimaryExpr
        if (this.at().type == tokens_1.TokenType.OpenParen) {
            return this.parseCallExpr(member);
        }
        return member;
    }
    parseCallExpr(caller) {
        let call_expr = {
            kind: ast_1.NodeType.CallExpression,
            callee: caller,
            args: this.parseArgs(),
        };
        if (this.at().type == tokens_1.TokenType.OpenParen) {
            call_expr = this.parseCallExpr(call_expr);
        }
        // Let's check for member access on the result of a call (e.g. `factory().item`)
        if (this.at().type === tokens_1.TokenType.Dot) {
            call_expr = this.parseMemberExprDown(call_expr); // Re-enter member parsing with this call as object
        }
        return call_expr;
    }
    parseMemberExpr() {
        let object = this.parsePrimaryExpr();
        while (this.at().type == tokens_1.TokenType.Dot || this.at().type == tokens_1.TokenType.OpenBracket) {
            if (this.at().type == tokens_1.TokenType.Dot) {
                this.eat(); // eat dot
                const property = this.expect(tokens_1.TokenType.Identifier, "Expected identifier after dot operator.").value;
                object = { kind: ast_1.NodeType.MemberExpression, object, property, computed: false };
            }
            else if (this.at().type == tokens_1.TokenType.OpenBracket) {
                this.eat(); // eat [
                const property = this.parseExpression();
                this.expect(tokens_1.TokenType.CloseBracket, "Expected ] after computed property.");
                object = { kind: ast_1.NodeType.MemberExpression, object, property, computed: true };
            }
        }
        return object;
    }
    // Helper to continue parsing member access after a potential call
    parseMemberExprDown(object) {
        while (this.at().type == tokens_1.TokenType.Dot) {
            this.eat(); // eat dot
            const property = this.expect(tokens_1.TokenType.Identifier, "Expected identifier after dot.").value;
            object = { kind: ast_1.NodeType.MemberExpression, object, property, computed: false };
            // If we see '(', it's a method call.
            if (this.at().type == tokens_1.TokenType.OpenParen) {
                object = this.parseCallExpr(object);
            }
        }
        return object;
    }
    parseArgs() {
        this.expect(tokens_1.TokenType.OpenParen, "Expected open paren");
        const args = this.at().type == tokens_1.TokenType.CloseParen
            ? []
            : this.parseArgumentsList();
        this.expect(tokens_1.TokenType.CloseParen, "Missing closing paren inside arguments list");
        return args;
    }
    parseArgumentsList() {
        const args = [this.parseAssignmentExpr()];
        while (this.at().type == tokens_1.TokenType.Comma && this.eat()) {
            args.push(this.parseAssignmentExpr());
        }
        return args;
    }
    parsePrimaryExpr() {
        const tk = this.at();
        switch (tk.type) {
            case tokens_1.TokenType.Identifier:
                return { kind: ast_1.NodeType.Identifier, symbol: this.eat().value };
            case tokens_1.TokenType.Integer:
                // We parse as float to support 3.14
                return { kind: ast_1.NodeType.NumericLiteral, value: parseFloat(this.eat().value) };
            case tokens_1.TokenType.String:
                return { kind: ast_1.NodeType.StringLiteral, value: this.eat().value };
            case tokens_1.TokenType.OpenParen: {
                this.eat(); // eat the opening paren
                const value = this.parseExpression();
                this.expect(tokens_1.TokenType.CloseParen, "Unexpected token found.");
                return value;
            }
            case tokens_1.TokenType.This:
                this.eat();
                return { kind: ast_1.NodeType.ThisExpression };
            case tokens_1.TokenType.New:
                this.eat(); // eat new
                const className = this.expect(tokens_1.TokenType.Identifier, "Expected class name after new.").value;
                const args = this.parseArgs();
                return { kind: ast_1.NodeType.NewExpression, className, args };
            case tokens_1.TokenType.OpenBracket:
                this.eat(); // eat [
                const elements = [];
                if (this.at().type !== tokens_1.TokenType.CloseBracket) {
                    elements.push(this.parseExpression());
                    while (this.at().type === tokens_1.TokenType.Comma && this.eat()) {
                        elements.push(this.parseExpression());
                    }
                }
                this.expect(tokens_1.TokenType.CloseBracket, "Expected ] after array elements");
                return { kind: ast_1.NodeType.ArrayLiteral, elements };
            default:
                console.error("Unexpected token found during parsing!", this.at());
                process.exit(1);
                throw new Error("Unexpected token");
        }
    }
}
exports.Parser = Parser;
