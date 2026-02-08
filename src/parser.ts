
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
    SwitchStatement,
    CaseClause,
    BreakStatement,
    ArrayLiteral,
    NodeType
} from "./ast";
import { Token, TokenType } from "./tokens";

export class Parser {
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
                return this.parseFnDeclaration();
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
                this.eat();
                this.expect(TokenType.SemiColon, "Expected ; after break");
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
                return { kind: NodeType.BreakStatement } as BreakStatement;
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

    private parseFnDeclaration(): Statement {
        this.eat(); // eat 'func'
        const name = this.expect(TokenType.Identifier, "Expected function name following func keyword.").value;

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

        return { kind: NodeType.FunctionDeclaration, body, name, params } as FunctionDeclaration;
    }

    private parseReturnStatement(): Statement {
        this.eat(); // eat 'return'
        const value = this.parseExpression();
        this.expect(TokenType.SemiColon, "Expected semicolon after return statement.");
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
            this.eat();
            this.expect(TokenType.OpenBrace, "Expected brace after else keyword");
            elseBranch = [];
            while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
                elseBranch.push(this.parseStatement());
            }
            this.expect(TokenType.CloseBrace, "Expected closing brace for else block");
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
        const name = this.expect(TokenType.Identifier, "Expected class name.").value;
        this.expect(TokenType.OpenBrace, "Expected open brace after class name.");

        const methods: FunctionDeclaration[] = [];
        const fields: VariableDeclaration[] = [];

        while (this.at().type !== TokenType.EOF && this.at().type !== TokenType.CloseBrace) {
            if (this.at().type === TokenType.Func) {
                const func = this.parseFnDeclaration() as FunctionDeclaration;
                methods.push(func);
            } else if (this.at().type === TokenType.Let) {
                const field = this.parseVarDeclaration() as VariableDeclaration;
                fields.push(field);
            } else {
                // Allow raw identifiers as fields? simpler to enforce 'let' for now or just 'identifier;'?
                // Let's stick to 'let' for fields to be consistent with var decl, or just identifier.
                // For C++ mapping, fields are usually 'Type name;'. In Riri, 'let x = 1;'
                // Let's stick to 'let' for now.
                this.eat(); // Skip unknown token to avoid infinite loop if error
            }
        }
        this.expect(TokenType.CloseBrace, "Expected closing brace for class declaration.");
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
        const left = this.parseComparisonExpr();

        if (this.at().type === TokenType.Equals) {
            this.eat(); // advance past equals
            const value = this.parseAssignmentExpr();
            return { value: value, assigne: left, kind: NodeType.BinaryExpression, left, right: value, operator: "=" } as BinaryExpression;
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
        let left = this.parseMultiplicitaveExpr();

        while (this.at().value == "+" || this.at().value == "-") {
            const operator = this.eat().value;
            const right = this.parseMultiplicitaveExpr();
            left = {
                kind: NodeType.BinaryExpression,
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
    }

    private parseMultiplicitaveExpr(): Expression {
        let left = this.parseCallMemberExpr();

        while (this.at().value == "/" || this.at().value == "*") {
            const operator = this.eat().value;
            const right = this.parseCallMemberExpr();
            left = {
                kind: NodeType.BinaryExpression,
                left,
                right,
                operator,
            } as BinaryExpression;
        }

        return left;
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
                this.eat(); // eat the opening paren
                const value = this.parseExpression();
                this.expect(TokenType.CloseParen, "Unexpected token found.");
                return value;
            }
            case TokenType.This:
                this.eat();
                return { kind: NodeType.ThisExpression } as ThisExpression;
            case TokenType.New:
                this.eat(); // eat new
                const className = this.expect(TokenType.Identifier, "Expected class name after new.").value;
                const args = this.parseArgs();
                return { kind: NodeType.NewExpression, className, args } as NewExpression;
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
}
