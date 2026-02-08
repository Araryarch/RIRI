export enum NodeType {
    // Statements
    Program = "Program",
    VariableDeclaration = "VariableDeclaration",
    FunctionDeclaration = "FunctionDeclaration",
    ClassDeclaration = "ClassDeclaration",
    ImportDeclaration = "ImportDeclaration",
    ReturnStatement = "ReturnStatement",
    IfStatement = "IfStatement",
    WhileStatement = "WhileStatement",
    ForStatement = "ForStatement",
    SwitchStatement = "SwitchStatement",
    BreakStatement = "BreakStatement",
    ExpressionStatement = "ExpressionStatement",
    TryStatement = "TryStatement",

    // Expressions
    AssignmentExpression = "AssignmentExpression",
    BinaryExpression = "BinaryExpression",
    CallExpression = "CallExpression",
    MemberExpression = "MemberExpression", // obj.prop
    NewExpression = "NewExpression", // new Class()
    ArrayLiteral = "ArrayLiteral", // [1, 2]
    Identifier = "Identifier",
    NumericLiteral = "NumericLiteral",
    StringLiteral = "StringLiteral",
    ThisExpression = "ThisExpression",
    AwaitExpression = "AwaitExpression",
    UnaryExpression = "UnaryExpression",
    ArrowFunctionExpression = "ArrowFunctionExpression"
}

export interface Statement {
    kind: NodeType;
}

export interface Program extends Statement {
    kind: NodeType.Program;
    body: Statement[];
}

export interface ClassDeclaration extends Statement {
    kind: NodeType.ClassDeclaration;
    name: string;
    methods: FunctionDeclaration[];
    fields: VariableDeclaration[];
}

export interface VariableDeclaration extends Statement {
    kind: NodeType.VariableDeclaration;
    identifier: string;
    value?: Expression;
}

export interface FunctionDeclaration extends Statement {
    kind: NodeType.FunctionDeclaration;
    name: string;
    params: string[];
    body: Statement[];
    async: boolean;
}

export interface ReturnStatement extends Statement {
    kind: NodeType.ReturnStatement;
    value: Expression;
}

export interface ExpressionStatement extends Statement {
    kind: NodeType.ExpressionStatement;
    expression: Expression;
}

export interface IfStatement extends Statement {
    kind: NodeType.IfStatement;
    condition: Expression;
    thenBranch: Statement[];
    elseBranch?: Statement[];
}

export interface WhileStatement extends Statement {
    kind: NodeType.WhileStatement;
    condition: Expression;
    body: Statement[];
}

export interface ForStatement extends Statement {
    kind: NodeType.ForStatement;
    init?: Statement;
    condition?: Expression;
    update?: Expression;
    body: Statement[];
}

export interface Expression extends Statement { }

export interface AssignmentExpression extends Expression {
    kind: NodeType.AssignmentExpression;
    assignee: Expression;
    value: Expression;
}

export interface BinaryExpression extends Expression {
    kind: NodeType.BinaryExpression;
    left: Expression;
    right: Expression;
    operator: string;
}

export interface CallExpression extends Expression {
    kind: NodeType.CallExpression;
    callee: Expression;
    args: Expression[];
}

export interface Identifier extends Expression {
    kind: NodeType.Identifier;
    symbol: string;
}

export interface NumericLiteral extends Expression {
    kind: NodeType.NumericLiteral;
    value: number;
}

export interface StringLiteral extends Expression {
    kind: NodeType.StringLiteral;
    value: string;
}

export interface NewExpression extends Expression {
    kind: NodeType.NewExpression;
    className: string;
    args: Expression[];
}

export interface MemberExpression extends Expression {
    kind: NodeType.MemberExpression;
    object: Expression;
    property: string | Expression;
    computed: boolean;
}

export interface ThisExpression extends Expression {
    kind: NodeType.ThisExpression;
}

export interface ArrayLiteral extends Expression {
    kind: NodeType.ArrayLiteral;
    elements: Expression[];
}

export interface SwitchStatement extends Statement {
    kind: NodeType.SwitchStatement;
    discriminant: Expression;
    cases: CaseClause[];
    defaultCase?: Statement[];
}

export interface CaseClause {
    test: Expression;
    consequent: Statement[];
}

export interface BreakStatement extends Statement {
    kind: NodeType.BreakStatement;
}

export interface ImportStatement extends Statement {
    kind: NodeType.ImportDeclaration;
    path: string;
}

export interface TryStatement extends Statement {
    kind: NodeType.TryStatement;
    body: Statement[];
    catchBody: Statement[];
    catchParam?: string; // e.g. catch (e)
    finallyBody?: Statement[];
}

export interface AwaitExpression extends Expression {
    kind: NodeType.AwaitExpression;
    argument: Expression;
}

export interface UnaryExpression extends Expression {
    kind: NodeType.UnaryExpression;
    operator: string;
    argument: Expression;
}
