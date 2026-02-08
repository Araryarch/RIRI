
import {
    Statement,
    Program,
    Expression,
    BinaryExpression,
    Identifier,
    NumericLiteral,
    StringLiteral,
    CallExpression,
    VariableDeclaration,
    FunctionDeclaration,
    ReturnStatement,
    IfStatement,
    WhileStatement,
    ForStatement,
    ExpressionStatement,
    ClassDeclaration,
    NewExpression,
    MemberExpression,
    ThisExpression,
    AssignmentExpression,
    SwitchStatement,
    CaseClause,
    BreakStatement,
    ArrayLiteral,
    TryStatement,
    AwaitExpression,
    UnaryExpression,
    ArrowFunctionExpression,
    ConditionalExpression,
    NodeType
} from "./ast";
import { Token, TokenType } from "./tokens";

export class Parser {
    // ... (constructor/produceAST etc unchanged) ...
    private tokens: Token[];
    private position: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public produceAST(): Program {
        const program: Program = {
            kind: NodeType.Program,
            body: []
        };

        while (this.notEOF()) {
            program.body.push(this.parseStatement());
        }

        return program;
    }

    private notEOF(): boolean {
        return this.tokens[this.position].type !== TokenType.EOF;
    }

    private at(): Token {
        return this.tokens[this.position];
    }

    private eat(): Token {
        const prev = this.tokens[this.position];
        this.position++;
        return prev;
    }

    private expect(type: TokenType, err: any): Token {
        const prev = this.tokens[this.position];
        if (!prev || prev.type !== type) {
            console.error("Parser Error:\n", err, prev, "Expected:", type);
            process.exit(1);
        }
        this.position++;
        return prev;
    }

    // --- Statements ---

    private parseStatement(): Statement {
        switch (this.at().type) {
            case TokenType.Let:
                return this.parseVarDeclaration();
            case TokenType.Func:
                return this.parseFunctionDeclaration();
            case TokenType.Async:
                return this.parseFunctionDeclaration();
            case TokenType.Return:
                return this.parseReturnStatement();
            case TokenType.If:
                return this.parseIfStatement();
            case TokenType.While:
                return this.parseWhileStatement();
            case TokenType.For:
                return this.parseForStatement();
            case TokenType.Class:
                return this.parseClassDeclaration();
            case TokenType.Switch:
                return this.parseSwitchStatement();
            case TokenType.Break:
                return this.parseBreakStatement();
            case TokenType.Import:
                return this.parseImportStatement();
            case TokenType.Try:
                return this.parseTryStatement();
            default:
                return this.parseExprStatement();
        }
    }

    private parseVarDeclaration(): Statement {
        this.eat(); // eat 'let'
        const identifier = this.expect(TokenType.Identifier, "Expected identifier name following let keywoard.").value;

        if (this.at().type === TokenType.SemiColon) {
            this.eat(); // eat ;
            return { kind: NodeType.VariableDeclaration, identifier, value: undefined } as VariableDeclaration;
        }

        this.expect(TokenType.Equals, "Expected equals token following identifier in let declaration.");
        const declaration = {
            kind: NodeType.VariableDeclaration,
            value: this.parseExpression(),
            identifier,
        } as VariableDeclaration;

        this.expect(TokenType.SemiColon, "Variable declaration statment must end with semicolon.");
        return declaration;
    }

    private parseFunctionDeclaration(): Statement {
        let isAsync = false;
        if (this.at().type === TokenType.Async) {
            this.eat(); // eat async
            isAsync = true;
        }

        this.eat(); // eat 'func' or 'fn'
        const name = this.expect(TokenType.Identifier, "Expected function name following func/fn keyword.").value;

        const args = this.parseArgs();
        const params: string[] = [];
        for (const arg of args) {
            if (arg.kind !== NodeType.Identifier) {
                throw "Function parameters must be identifiers";
            }
            params.push((arg as Identifier).symbol);
        }

        this.expect(TokenType.OpenBrace, "Expected function body following declaration.");
        const body: Statement[] = [];
        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(TokenType.CloseBrace, "Closing brace expected inside function declaration");

        return { kind: NodeType.FunctionDeclaration, body, name, params, async: isAsync } as FunctionDeclaration;
    }

    private parseReturnStatement(): Statement {
        this.eat(); // eat return
        if (this.at().type == TokenType.SemiColon) {
            this.eat();
            return { kind: NodeType.ReturnStatement, value: undefined } as ReturnStatement;
        }
        const value = this.parseExpression();
        this.expect(TokenType.SemiColon, "Expected ; after return statement");
        return { kind: NodeType.ReturnStatement, value } as ReturnStatement;
    }

    private parseIfStatement(): Statement {
        this.eat(); // eat 'if'
        this.expect(TokenType.OpenParen, "Expected open paren after if");
        const condition = this.parseExpression();
        this.expect(TokenType.CloseParen, "Expected close paren after condition");

        this.expect(TokenType.OpenBrace, "Expected brace after if condition");
        const thenBranch: Statement[] = [];
        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            thenBranch.push(this.parseStatement());
        }
        this.expect(TokenType.CloseBrace, "Expected closing brace for if block");

        let elseBranch: Statement[] | undefined;
        if (this.at().type === TokenType.Else) {
            this.eat(); // eat else
            if (this.at().type === TokenType.If) {
                // else if handled as a single statement in the else branch
                elseBranch = [this.parseIfStatement()];
            } else {
                this.expect(TokenType.OpenBrace, "Expected brace after else keyword");
                elseBranch = [];
                while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
                    elseBranch.push(this.parseStatement());
                }
                this.expect(TokenType.CloseBrace, "Expected closing brace for else block");
            }
        }

        return { kind: NodeType.IfStatement, condition, thenBranch, elseBranch } as IfStatement;
    }

    private parseWhileStatement(): Statement {
        this.eat(); // eat 'while'
        this.expect(TokenType.OpenParen, "Expected open paren after while");
        const condition = this.parseExpression();
        this.expect(TokenType.CloseParen, "Expected close paren after condition");

        this.expect(TokenType.OpenBrace, "Expected brace after while condition");
        const body: Statement[] = [];
        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(TokenType.CloseBrace, "Expected closing brace for while block");

        return { kind: NodeType.WhileStatement, condition, body } as WhileStatement;
    }

    private parseSwitchStatement(): Statement {
        this.eat(); // eat switch
        this.expect(TokenType.OpenParen, "Expected ( after switch");
        const discriminant = this.parseExpression();
        this.expect(TokenType.CloseParen, "Expected ) after switch condition");
        this.expect(TokenType.OpenBrace, "Expected { after switch condition");

        const cases: CaseClause[] = [];
        let defaultCase: Statement[] | undefined;

        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            if (this.at().type === TokenType.Case) {
                this.eat();
                const test = this.parseExpression();
                this.expect(TokenType.Colon, "Expected : after case value");
                const consequent: Statement[] = [];

                // Parse statements until break, case, default, or }
                // Actually C-style switch falls through. We capture statements until next case/default/end.
                // ALSO handles block scope { ... } if user puts it.
                // The current parseStatement() handles BlockStatement? No, we don't have BlockStatement yet.
                // We have parseStatement which can be many things.
                // If the user wrote `case 1: { ... }`, `parseStatement` might need to handle `{`?
                // Currently `parseStatement` does NOT handle `{` (OpenBrace).
                // We need to add a "BlockStatement" or just handle `{` inside parseStatement to return a list?
                // Or easier: inside here, if we see `{`, we parse it as a sequence of statements.

                if (this.at().type === TokenType.OpenBrace) {
                    this.eat(); // eat {
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        consequent.push(this.parseStatement());
                    }
                    this.expect(TokenType.CloseBrace, "Expected } after case block");
                } else {
                    while (
                        this.at().type !== TokenType.Case &&
                        this.at().type !== TokenType.Default &&
                        this.at().type !== TokenType.CloseBrace &&
                        this.at().type !== TokenType.EOF
                    ) {
                        consequent.push(this.parseStatement());
                    }
                }

                cases.push({ test, consequent });
            } else if (this.at().type === TokenType.Default) {
                this.eat();
                this.expect(TokenType.Colon, "Expected : after default");
                const consequent: Statement[] = [];

                if (this.at().type === TokenType.OpenBrace) {
                    this.eat(); // eat {
                    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                        consequent.push(this.parseStatement());
                    }
                    this.expect(TokenType.CloseBrace, "Expected } after default block");
                } else {
                    while (
                        this.at().type !== TokenType.Case &&
                        this.at().type !== TokenType.Default &&
                        this.at().type !== TokenType.CloseBrace &&
                        this.at().type !== TokenType.EOF
                    ) {
                        consequent.push(this.parseStatement());
                    }
                }

                defaultCase = consequent;
            } else {
                // Comments or empty lines handled by lexer/parser loop hopefully?
                // If we hit something else inside switch block that isn't case/default, it's an error?
                // Or maybe dead code?
                console.error("Unexpected token inside switch", this.at());
                this.eat(); // Skip to avoid loop
            }
        }

        this.expect(TokenType.CloseBrace, "Expected } after switch body");
        return { kind: NodeType.SwitchStatement, discriminant, cases, defaultCase } as SwitchStatement;
    }

    private parseForStatement(): Statement {
        // for (let i = 0; i < 10; i = i + 1) { ... }
        this.eat(); // eat 'for'
        this.expect(TokenType.OpenParen, "Expected open paren after for");

        // Init
        let init: Statement | undefined;
        if (this.at().type !== TokenType.SemiColon) {
            init = this.parseStatement(); // usually a var decl or expr stmt
            // parseStatement consumes the semicolon for var decl
            // If it was an expression statement, we need to check if semicolon was consumed.
            // But let's assume standard for-loop structure: init is a statement (likely var decl).
            // Standard parser logic: `parseVarDeclaration` consumes semicolon.
        } else {
            this.eat(); // empty init
        }

        // Condition
        let condition: Expression | undefined;
        if (this.at().type !== TokenType.SemiColon) {
            condition = this.parseExpression();
        }
        this.expect(TokenType.SemiColon, "Expected semicolon after loop condition");

        // Update
        let update: Expression | undefined;
        if (this.at().type !== TokenType.CloseParen) {
            update = this.parseExpression();
        }
        this.expect(TokenType.CloseParen, "Expected close paren after loop update");

        this.expect(TokenType.OpenBrace, "Expected brace after for loop header");
        const body: Statement[] = [];
        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(TokenType.CloseBrace, "Expected closing brace for for loop");

        return { kind: NodeType.ForStatement, init, condition, update, body } as ForStatement;
    }

    private parseClassDeclaration(): Statement {
        this.eat(); // eat class
        const name = this.expect(TokenType.Identifier, "Expected class name following class keyword.").value;
        this.expect(TokenType.OpenBrace, "Expected class body following name.");

        const methods: FunctionDeclaration[] = [];
        const fields: VariableDeclaration[] = [];

        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            // Optional 'let' or 'func' keyword?
            // Riri style: fields use 'let', methods use 'func'?
            // Or just names?
            // Test 06 uses `let count = 0;` and `func inc()`.

            if (this.at().type === TokenType.Let) {
                this.eat(); // consume let
            }
            // If func keyword?
            // Tests use `func inc()`.
            // So we might see `func`.
            // But usually parseFunctionDeclaration handles func?
            // Here we are inside class body.

            if (this.at().type === TokenType.Func) {
                // It's a method
                // But logic below expects memberName first? 
                // Wait, logic below: `const memberName = this.expect(TokenType.Identifier, ...).value;`
                // If `func inc()`, this.at() is `Fn`. Expect `Identifier` fails.

                // So we must handle `func` keyword too?
                this.eat(); // consume func
            }

            const memberName = this.expect(TokenType.Identifier, "Expected member name").value;

            if (this.at().type == TokenType.OpenParen) {
                // Method (shorthand `name() {}`)
                // Parse params manually as parseArgs() parses Expressions, not Identifiers for definition.
                this.eat(); // (
                const params: string[] = [];
                if (this.at().type !== TokenType.CloseParen) {
                    params.push(this.expect(TokenType.Identifier, "Expected param name").value);
                    while (this.at().type == TokenType.Comma && this.eat()) {
                        params.push(this.expect(TokenType.Identifier, "Expected param name").value);
                    }
                }
                this.expect(TokenType.CloseParen, "Expected ) after params");

                this.expect(TokenType.OpenBrace, "Expected { for method body");
                const body: Statement[] = [];
                while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
                    body.push(this.parseStatement());
                }
                this.expect(TokenType.CloseBrace, "Expected } after method body");

                methods.push({ kind: NodeType.FunctionDeclaration, name: memberName, params, body, async: false } as FunctionDeclaration);
            } else {
                // Field
                let value: Expression | undefined;
                if (this.at().type == TokenType.Equals) {
                    this.eat();
                    value = this.parseExpression();
                }
                this.expect(TokenType.SemiColon, "Expected ; after field declaration");
                fields.push({ kind: NodeType.VariableDeclaration, identifier: memberName, value } as VariableDeclaration);
            }
        }

        this.expect(TokenType.CloseBrace, "Expected closing brace inside class declaration");
        return { kind: NodeType.ClassDeclaration, name, methods, fields } as ClassDeclaration;
    }

    private parseExprStatement(): Statement {
        const expr = this.parseExpression();
        this.expect(TokenType.SemiColon, "Expected semicolon after expression.");
        return { kind: NodeType.ExpressionStatement, expression: expr } as ExpressionStatement;
    }

    // --- Expressions ---

    private parseExpression(): Expression {
        return this.parseAssignmentExpr();
    }

    private parseAssignmentExpr(): Expression {
        const left = this.parseConditionalExpr();

        if (this.at().type == TokenType.Equals) {
            this.eat(); // advance past equals
            const value = this.parseAssignmentExpr();
            return { value, assignee: left, kind: NodeType.AssignmentExpression } as AssignmentExpression;
        }

        return left;
    }

    private parseConditionalExpr(): Expression {
        // Ternary: condition ? consequent : alternate
        const test = this.parseLogicalOrExpr();

        if (this.at().type === TokenType.Question) {
            this.eat(); // consume ?
            const consequent = this.parseAssignmentExpr();
            this.expect(TokenType.Colon, "Expected ':' in ternary expression");
            const alternate = this.parseConditionalExpr();
            return {
                kind: NodeType.ConditionalExpression,
                test,
                consequent,
                alternate
            } as ConditionalExpression;
        }

        return test;
    }

    private parseLogicalOrExpr(): Expression {
        let left = this.parseLogicalAndExpr();

        while (this.at().type === TokenType.Or) {
            const operator = this.eat().value;
            const right = this.parseLogicalAndExpr();
            left = { kind: NodeType.BinaryExpression, left, right, operator } as BinaryExpression;
        }

        return left;
    }

    private parseLogicalAndExpr(): Expression {
        let left = this.parseComparisonExpr();

        while (this.at().type === TokenType.And) {
            const operator = this.eat().value;
            const right = this.parseComparisonExpr();
            left = { kind: NodeType.BinaryExpression, left, right, operator } as BinaryExpression;
        }

        return left;
    }


    private parseComparisonExpr(): Expression {
        let left = this.parseAdditiveExpr();

        while (
            this.at().type === TokenType.EqEq ||
            this.at().type === TokenType.NotEq ||
            this.at().type === TokenType.Less ||
            this.at().type === TokenType.Greater ||
            this.at().type === TokenType.LessEq ||
            this.at().type === TokenType.GreaterEq
        ) {
            const operator = this.eat().value;
            const right = this.parseAdditiveExpr();
            left = {
                kind: NodeType.BinaryExpression,
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
    }

    private parseAdditiveExpr(): Expression {
        let left = this.parseMultiplicativeExpr();

        while (this.at().value == "+" || this.at().value == "-") {
            const operator = this.eat().value;
            const right = this.parseMultiplicativeExpr();
            left = {
                kind: NodeType.BinaryExpression,
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
    }

    private parseMultiplicativeExpr(): Expression {
        let left = this.parseUnaryExpr();

        while (this.at().value == "/" || this.at().value == "*" || this.at().value == "%") {
            const operator = this.eat().value;
            const right = this.parseUnaryExpr();
            left = {
                kind: NodeType.BinaryExpression,
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
    }

    private parseUnaryExpr(): Expression {
        // Handle unary minus: -5, -x
        if (this.at().type === TokenType.Minus) {
            const operator = this.eat().value;
            const argument = this.parseUnaryExpr();
            return { kind: NodeType.UnaryExpression, operator, argument } as UnaryExpression;
        }

        return this.parseCallMemberExpr();
    }

    private parseCallMemberExpr(): Expression {
        const member = this.parseMemberExpr(); // Changed from parsePrimaryExpr

        if (this.at().type == TokenType.OpenParen) {
            return this.parseCallExpr(member);
        }

        return member;
    }

    private parseCallExpr(caller: Expression): Expression {
        let call_expr: Expression = {
            kind: NodeType.CallExpression,
            callee: caller,
            args: this.parseArgs(),
        } as CallExpression;

        if (this.at().type == TokenType.OpenParen) {
            call_expr = this.parseCallExpr(call_expr);
        }

        // Let's check for member access on the result of a call (e.g. `factory().item`)
        if (this.at().type === TokenType.Dot) {
            call_expr = this.parseMemberExprDown(call_expr) as unknown as CallExpression; // Re-enter member parsing with this call as object
        }

        return call_expr;
    }

    private parseMemberExpr(): Expression {
        let object = this.parsePrimaryExpr();

        while (this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket) {
            if (this.at().type == TokenType.Dot) {
                this.eat(); // eat dot
                const property = this.expect(TokenType.Identifier, "Expected identifier after dot operator.").value;
                object = { kind: NodeType.MemberExpression, object, property, computed: false } as MemberExpression;
            } else if (this.at().type == TokenType.OpenBracket) {
                this.eat(); // eat [
                const property = this.parseExpression();
                this.expect(TokenType.CloseBracket, "Expected ] after computed property.");
                object = { kind: NodeType.MemberExpression, object, property, computed: true } as MemberExpression;
            }
        }

        return object;
    }

    // Helper to continue parsing member access after a potential call
    private parseMemberExprDown(object: Expression): Expression {
        while (this.at().type == TokenType.Dot) {
            this.eat(); // eat dot
            const property = this.expect(TokenType.Identifier, "Expected identifier after dot.").value;
            object = { kind: NodeType.MemberExpression, object, property, computed: false } as MemberExpression;

            // If we see '(', it's a method call.
            if (this.at().type == TokenType.OpenParen) {
                object = this.parseCallExpr(object);
            }
        }
        return object;
    }


    private parseArgs(): Expression[] {
        this.expect(TokenType.OpenParen, "Expected open paren");
        const args = this.at().type == TokenType.CloseParen
            ? []
            : this.parseArgumentsList();

        this.expect(TokenType.CloseParen, "Missing closing paren inside arguments list");
        return args;
    }

    private parseArgumentsList(): Expression[] {
        const args = [this.parseAssignmentExpr()];

        while (this.at().type == TokenType.Comma && this.eat()) {
            args.push(this.parseAssignmentExpr());
        }
        return args;
    }

    private parsePrimaryExpr(): Expression {
        const tk = this.at();

        switch (tk.type) {
            case TokenType.Identifier:
                return { kind: NodeType.Identifier, symbol: this.eat().value } as Identifier;
            case TokenType.Integer:
                // We parse as float to support 3.14
                return { kind: NodeType.NumericLiteral, value: parseFloat(this.eat().value) } as NumericLiteral;
            case TokenType.String:
                return { kind: NodeType.StringLiteral, value: this.eat().value } as StringLiteral;
            case TokenType.OpenParen: {
                this.eat(); // eat (
                // We need to tentatively parse as arguments if we see ')' and '=>' later.
                // Or standard expression.
                // Since we don't have comma operator, a list of expressions "a, b" is INVALID as a standard expression.
                // So if we find commas, it MUST be an arrow function arguments list (or tuple, but we don't have tuples).
                // If no commas, "a", it could be "(a)" (grouped expr) OR "(a) => ..." (arrow arg).

                // Let's try to parse arguments list logic.
                // But `parseArgumentsList` expects assignments.
                // An argument list for definition is usually Identifiers?
                // `(a, b) => ...`. `a` and `b` must be identifiers.
                // `(1) => ...` is invalid.

                // Strategy:
                // 1. Parse a list of expressions (comma separated).
                // 2. Check for `)`.
                // 3. Check for `=>`.
                // 4. If `=>` is present, verify all expressions are identifiers. If so, return ArrowFunction.
                // 5. If `=>` is NOT present:
                //    a. If more than 1 expression, Error (no comma operator).
                //    b. If 0 expressions `()`, Error? `()` is void? Arrow `() => ...` is valid.
                //    c. If 1 expression, return it as parenthesized expression.

                const exprs: Expression[] = [];
                if (this.at().type !== TokenType.CloseParen) {
                    exprs.push(this.parseExpression());
                    while (this.at().type === TokenType.Comma) {
                        this.eat();
                        exprs.push(this.parseExpression());
                    }
                }

                this.expect(TokenType.CloseParen, "Expected ) after parenthesized expression or arguments.");

                if (this.at().type === TokenType.Arrow) {
                    this.eat(); // eat =>

                    // Verify params are identifiers
                    const params: string[] = [];
                    for (const e of exprs) {
                        if (e.kind !== NodeType.Identifier) {
                            throw new Error("Arrow function parameters must be identifiers.");
                        }
                        params.push((e as Identifier).symbol);
                    }

                    // Parse body
                    // Body can be Block `{ ... }` or Expression.
                    let body: Statement[] = [];
                    if (this.at().type === TokenType.OpenBrace) {
                        this.eat(); // eat {
                        while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
                            body.push(this.parseStatement());
                        }
                        this.expect(TokenType.CloseBrace, "Expected } after arrow function body.");
                    } else {
                        // Expression body `=> x + 1` -> `{ return x + 1; }`
                        const expr = this.parseExpression();
                        body.push({ kind: NodeType.ReturnStatement, value: expr } as ReturnStatement);
                        // Optional semicolon? Expression might be part of assignment `let x = ...;`
                        // so we don't consume semicolon here usually.
                    }

                    return { kind: NodeType.ArrowFunctionExpression, params, body } as ArrowFunctionExpression;
                }

                // Not an arrow function.
                if (exprs.length === 0) {
                    throw new Error("Empty parenthesized expression '()' is not allowed unless it is an arrow function.");
                }
                if (exprs.length > 1) {
                    throw new Error("Comma operator (tuples) is not supported. Did you mean an arrow function? Missing '=>'.");
                }

                return exprs[0];
            }
            case TokenType.This:
                this.eat();
                return { kind: NodeType.ThisExpression } as ThisExpression;
            case TokenType.New:
                this.eat(); // eat new
                const className = this.expect(TokenType.Identifier, "Expected class name after new.").value;
                const args = this.parseArgs();
                return { kind: NodeType.NewExpression, className, args } as NewExpression;
            case TokenType.Await:
                this.eat(); // eat await
                const arg = this.parseExpression();
                return { kind: NodeType.AwaitExpression, argument: arg } as AwaitExpression;
            case TokenType.OpenBracket:
                this.eat(); // eat [
                const elements: Expression[] = [];
                if (this.at().type !== TokenType.CloseBracket) {
                    elements.push(this.parseExpression());
                    while (this.at().type === TokenType.Comma && this.eat()) {
                        elements.push(this.parseExpression());
                    }
                }
                this.expect(TokenType.CloseBracket, "Expected ] after array elements");
                return { kind: NodeType.ArrayLiteral, elements } as ArrayLiteral;
            default:
                console.error("Unexpected token found during parsing!", this.at());
                process.exit(1);
                throw new Error("Unexpected token");
        }
    }

    private parseBreakStatement(): Statement {
        this.eat(); // eat break
        this.expect(TokenType.SemiColon, "Expected ; after break statement.");
        return { kind: NodeType.BreakStatement } as BreakStatement;
    }

    private parseImportStatement(): Statement {
        this.eat(); // eat import
        const pathToken = this.expect(TokenType.String, "Expected string after import statement.");
        this.expect(TokenType.SemiColon, "Expected ; after import statement.");
        return { kind: NodeType.ImportDeclaration, path: pathToken.value } as unknown as Statement;
    }

    private parseTryStatement(): Statement {
        this.eat(); // eat try
        this.expect(TokenType.OpenBrace, "Expected { after try");
        const body: Statement[] = [];
        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            body.push(this.parseStatement());
        }
        this.expect(TokenType.CloseBrace, "Expected } after try block");

        const catchBody: Statement[] = [];
        let catchParam: string | undefined;

        if (this.at().type === TokenType.Catch) {
            this.eat(); // eat catch
            if (this.at().type === TokenType.OpenParen) {
                this.eat();
                catchParam = this.expect(TokenType.Identifier, "Expected identifier for catch error").value;
                this.expect(TokenType.CloseParen, "Expected ) after catch param");
            }

            this.expect(TokenType.OpenBrace, "Expected { after catch");
            while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
                catchBody.push(this.parseStatement());
            }
            this.expect(TokenType.CloseBrace, "Expected } after catch block");
        }

        let finallyBody: Statement[] | undefined;
        if (this.at().type === TokenType.Finally) {
            this.eat(); // eat finally
            this.expect(TokenType.OpenBrace, "Expected { after finally");
            finallyBody = [];
            while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
                finallyBody.push(this.parseStatement());
            }
            this.expect(TokenType.CloseBrace, "Expected } after finally block");
        }

        return { kind: NodeType.TryStatement, body, catchBody, catchParam, finallyBody } as TryStatement;
    }
}
