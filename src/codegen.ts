
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
    ArrayLiteral,
    SwitchStatement,
    BreakStatement,
    TryStatement,
    AwaitExpression,
    NodeType
} from "./ast";

export class CodeGenerator {
    private program: Program;

    constructor(program: Program) {
        this.program = program;
    }

    public generate(): string {
        let cppCode = "#include <iostream>\n#include <vector>\n#include <string>\n#include <functional>\n#include <cmath>\n#include <algorithm>\n\n";

        // Helper for printing
        cppCode += `
template <typename T>
void print_val(T t) {
    if constexpr (std::is_same_v<T, std::string> || std::is_same_v<T, const char*>) {
        std::cout << t;
    } else {
        std::cout << t;
    }
}
void print_val(const char* t) { std::cout << t; }
\n`;

        // Add built-in libraries
        cppCode += this.getBuiltinLibraries();

        const classes: string[] = [];
        const functions: string[] = [];
        const mainBody: string[] = [];

        for (const stmt of this.program.body) {
            if (stmt.kind === NodeType.ClassDeclaration) {
                classes.push(this.genClassDeclaration(stmt as ClassDeclaration));
            } else if (stmt.kind === NodeType.FunctionDeclaration) {
                // Functions usually return 'auto' in our system
                functions.push(this.genFuncDeclaration(stmt as FunctionDeclaration));
            } else {
                mainBody.push(this.genStatement(stmt));
            }
        }

        // Add classes (forward declaration might be needed but for now sequential)
        for (const cls of classes) {
            cppCode += cls;
        }

        // Add functions
        for (const func of functions) {
            cppCode += func;
        }

        // Add main function
        cppCode += "int main() {\n";
        for (const stmt of mainBody) {
            cppCode += stmt;
        }
        cppCode += "return 0;\n}\n";

        return cppCode;
    }

    private genStatement(stmt: Statement): string {
        switch (stmt.kind) {
            case NodeType.VariableDeclaration:
                return this.genVarDeclaration(stmt as VariableDeclaration);
            case NodeType.FunctionDeclaration:
                return this.genFuncDeclaration(stmt as FunctionDeclaration);
            case NodeType.ReturnStatement:
                return this.genReturnStatement(stmt as ReturnStatement);
            case NodeType.IfStatement:
                return this.genIfStatement(stmt as IfStatement);
            case NodeType.WhileStatement:
                return this.genWhileStatement(stmt as WhileStatement);
            case NodeType.ForStatement:
                return this.genForStatement(stmt as ForStatement);
            case NodeType.ExpressionStatement:
                return this.genExprStatement(stmt as ExpressionStatement);
            case NodeType.SwitchStatement:
                return this.genSwitchStatement(stmt as SwitchStatement);
            case NodeType.BreakStatement:
                return "break;\n";
            case NodeType.ImportDeclaration:
                return "// import " + (stmt as any).path + "\n";
            case NodeType.TryStatement:
                return this.genTryStatement(stmt as TryStatement);
            default:
                throw new Error(`Unknown statement kind: ${stmt.kind}`);
        }
    }

    private genVarDeclaration(stmt: VariableDeclaration): string {
        if (!stmt.value) {
            return `int ${stmt.identifier};\n`;
        }

        return `auto ${stmt.identifier} = ${this.genExpression(stmt.value)};\n`;
    }

    private genFuncDeclaration(stmt: FunctionDeclaration): string {
        // Use C++20 auto template parameters
        const params = stmt.params.map(p => `auto ${p}`).join(", ");
        // Return type 'auto'

        let body = "{\n";
        for (const s of stmt.body) {
            body += this.genStatement(s);
        }
        body += "}\n\n";

        const funcName = stmt.name === "main" ? "riri_main" : stmt.name;
        return `auto ${funcName}(${params}) ${body}`;
    }

    private genReturnStatement(stmt: ReturnStatement): string {
        return `return ${this.genExpression(stmt.value)};\n`;
    }

    private genIfStatement(stmt: IfStatement): string {
        let code = `if (${this.genExpression(stmt.condition)}) {\n`;
        for (const s of stmt.thenBranch) {
            code += this.genStatement(s);
        }
        code += "}";

        if (stmt.elseBranch) {
            code += " else {\n";
            for (const s of stmt.elseBranch) {
                code += this.genStatement(s);
            }
            code += "}";
        }
        code += "\n";
        return code;
    }

    private genWhileStatement(stmt: WhileStatement): string {
        let code = `while (${this.genExpression(stmt.condition)}) {\n`;
        for (const s of stmt.body) {
            code += this.genStatement(s);
        }
        code += "}\n";
        return code;
    }

    private genForStatement(stmt: ForStatement): string {
        let code = "for (";
        if (stmt.init) {
            // Warning: genStatement returns string with newline/semicolon usually.
            // We need to strip newline for for-loop header if it adds one.
            // genVarDeclaration adds ';\n'.
            code += this.genStatement(stmt.init).trim();
        } else {
            code += ";";
        }

        // The previous statement (init) usually ends with semicolon, so we check.
        // But genVarDeclaration returns "int x = 0;\n". trim() -> "int x = 0;". Perfect.

        code += " ";
        if (stmt.condition) {
            code += this.genExpression(stmt.condition);
        }
        code += "; ";

        if (stmt.update) {
            code += this.genExpression(stmt.update);
        }

        code += ") {\n";
        for (const s of stmt.body) {
            code += this.genStatement(s);
        }
        code += "}\n";
        return code;
    }

    private genExprStatement(stmt: ExpressionStatement): string {
        return `${this.genExpression(stmt.expression)};\n`;
    }

    // --- Expressions ---

    private genExpression(expr: Expression): string {
        switch (expr.kind) {
            case NodeType.BinaryExpression:
                return this.genBinaryExpr(expr as BinaryExpression);
            case NodeType.CallExpression:
                return this.genCallExpr(expr as CallExpression);
            case NodeType.MemberExpression:
                return this.genMemberExpr(expr as MemberExpression);
            case NodeType.NewExpression:
                return this.genNewExpr(expr as NewExpression);
            case NodeType.ThisExpression:
                return "this";
            case NodeType.Identifier:
                const symbol = (expr as Identifier).symbol;
                return symbol === "main" ? "riri_main" : symbol;
            case NodeType.NumericLiteral:
                return (expr as NumericLiteral).value.toString();
            case NodeType.StringLiteral:
                return `std::string("${(expr as StringLiteral).value}")`;
            case NodeType.ArrayLiteral:
                return this.genArrayLiteral(expr as ArrayLiteral);
            case NodeType.AwaitExpression:
                // For MVP: await is blocking, just generate the argument (which might be a fetch call)
                return this.genExpression((expr as AwaitExpression).argument);
            default:
                throw new Error(`Unknown expression kind: ${expr.kind}`);
        }
    }

    private genBinaryExpr(expr: BinaryExpression): string {
        return `${this.genExpression(expr.left)} ${expr.operator} ${this.genExpression(expr.right)}`;
    }

    private genArrayLiteral(expr: ArrayLiteral): string {
        const elements = expr.elements.map(e => this.genExpression(e)).join(", ");
        // deduce type?
        // if empty or numbers, assume int
        // if strings, string
        // C++ vector init: std::vector<T>{...}
        // Since we return `auto` in variables, we need to be careful.
        // `{1, 2}` is initializer list. `auto x = {1, 2}` deduces `std::initializer_list`.
        // We want `std::vector`.
        // Hack: check first element type.
        // MVP: int vector default.
        return `std::vector<int>{${elements}}`;
    }

    private genCallExpr(expr: CallExpression): string {
        // Check if it is a console.log call
        // 1. Direct identifier "console.log" (if parser somehow allowed it, unlikely with dot)
        // 2. MemberExpression console . log

        let isConsoleLog = false;
        let isMathCall = false;
        let mathFunc = "";

        if (expr.callee.kind === NodeType.Identifier && (expr.callee as Identifier).symbol === "console.log") {
            isConsoleLog = true;
        } else if (expr.callee.kind === NodeType.MemberExpression) {
            const member = expr.callee as MemberExpression;
            if (member.object.kind === NodeType.Identifier) {
                const objName = (member.object as Identifier).symbol;
                if (objName === "console" && member.property === "log") {
                    isConsoleLog = true;
                } else if (objName === "Math") {
                    // Map Math.sin -> std::sin
                    isMathCall = true;
                    mathFunc = `std::${member.property}`;
                }
            }
        }

        if (isConsoleLog) {
            let code = "";
            for (let i = 0; i < expr.args.length; i++) {
                code += `print_val(${this.genExpression(expr.args[i])});`;
                if (i < expr.args.length - 1) {
                    code += `std::cout << " ";`;
                }
            }
            code += `std::cout << std::endl;`;
            return code;
        }

        if (isMathCall) {
            const args = expr.args.map(a => this.genExpression(a)).join(", ");
            return `${mathFunc}(${args})`;
        }

        const callee = this.genExpression(expr.callee);

        if (callee === "print") {
            const printArgs = expr.args.map(a => this.genExpression(a)).join(" << \" \" << ");
            return `std::cout << ${printArgs} << std::endl`;
        }

        if (callee === "input") {
            return `_riri_input()`;
        }

        if (callee === "input") {
            return `_riri_input()`;
        }

        if (callee === "tprint") {
            // tprint(arr)
            const args = expr.args.map(a => this.genExpression(a)).join(", ");
            return `_riri_tprint(${args});\n`;
        }

        if (callee === "fetch") {
            // fetch(url)
            const args = expr.args.map(a => this.genExpression(a)).join(", ");
            return `_riri_fetch(${args})`;
        }

        const args = expr.args.map(a => this.genExpression(a)).join(", ");
        return `${callee}(${args})`;
    }

    private genSwitchStatement(stmt: SwitchStatement): string {
        let code = `switch (${this.genExpression(stmt.discriminant)}) {\n`;
        for (const c of stmt.cases) {
            code += `case ${this.genExpression(c.test)}: {\n`;
            for (const s of c.consequent) {
                code += this.genStatement(s);
            }
            code += "}\n";
        }
        if (stmt.defaultCase) {
            code += "default: {\n";
            for (const s of stmt.defaultCase) {
                code += this.genStatement(s);
            }
            code += "}\n";
        }
        code += "}\n";
        return code;
    }

    private genClassDeclaration(stmt: ClassDeclaration): string {
        let code = `struct ${stmt.name} {\n`;

        for (const field of stmt.fields) {
            let type = "int";
            if (field.value && field.value.kind === NodeType.StringLiteral) {
                type = "std::string";
            }

            if (field.value) {
                code += `${type} ${field.identifier} = ${this.genExpression(field.value)};\n`;
            } else {
                code += `${type} ${field.identifier};\n`;
            }
        }

        // Methods
        for (const method of stmt.methods) {
            // auto method(auto a, auto b) { ... }
            const params = method.params.map(p => `auto ${p}`).join(", ");
            let body = "{\n";
            for (const s of method.body) {
                body += this.genStatement(s);
            }
            body += "}\n";
            code += `auto ${method.name}(${params}) ${body}`;
        }

        code += "};\n\n";
        return code;
    }

    private genNewExpr(expr: NewExpression): string {
        const args = expr.args.map(a => this.genExpression(a)).join(", ");
        return `new ${expr.className}(${args})`; // C++ new returns pointer
    }

    private genTryStatement(stmt: TryStatement): string {
        let code = "try {\n";
        for (const s of stmt.body) {
            code += this.genStatement(s);
        }
        code += "} ";

        if (stmt.catchBody.length > 0 || stmt.catchParam) {
            // catch (...) generic catch or typed?
            // C++: catch (const std::exception& e) or catch (...)
            // For MVP, catch all or catch string?
            // If user did `catch (e)`, we can't easily infer type of e.
            // Let's use `catch (...)` or `catch (const std::exception& e)` if we use exceptions.
            // Riri currently doesn't throw.
            // But system might (e.g. vector out of range? though [] is usually unchecked or segfault).
            // Let's support `catch (...)` for now.

            // If user provided param "e", we need to define it?
            // We can assume it's a string message?
            // Hack: `catch (const std::exception& e)` and define variable `e`?

            if (stmt.catchParam) {
                code += `catch (const std::exception& ${stmt.catchParam}) {\n`;
            } else {
                code += "catch (...) {\n";
            }

            for (const s of stmt.catchBody) {
                code += this.genStatement(s);
            }
            code += "}\n";
        }

        if (stmt.finallyBody) {
            // C++ doesn't have finally.
            // We can approximate by putting finally code after try-catch?
            // But unrelated to flow control (return/break).
            // Proper finally needs RAII or specific structure.
            // MVP: Just append code after try-catch block?
            // NOTE: This breaks on early return inside try.
            // But implementing full RAII / ScopeGuard is complex in codegen.
            // We will warn: "Finally block is executed after try/catch, but may be skipped on return".
            // Or we just append it.
            code += "{ // finally imitation\n";
            for (const s of stmt.finallyBody) {
                code += this.genStatement(s);
            }
            code += "}\n";
        }
        return code;
    }

    private genMemberExpr(expr: MemberExpression): string {
        if (expr.computed) {
            return `${this.genExpression(expr.object)}[${this.genExpression(expr.property as Expression)}]`;
        }

        // Check if object is a string or array (std::vector) which are value types, thus use dot (.)
        // This is a naive check. A better way uses type checker.
        // For MVP, we'll try to guess based on variable usage or just support both?
        // C++: ptr->member, obj.member.
        // We defined all objects (NewExpression) as pointers (new Class).
        // Strings are std::string (value).
        // Arrays are std::vector (value).

        // If the object expression comes from a StringLiteral or ArrayLiteral, it's a value.
        // If it's an Identifier, we need to know its type. We don't have a symbol table with types here easily.
        // HACK: We can use a C++ macro or template? 
        // Or specific known methods for strings? length, substr.
        // Helper: `call_method(obj, method, args...)`?
        // Let's rely on a simple heuristic:
        // content types are values (string, vector).
        // User classes are pointers.

        // We can look at the property name.
        // String/Vector methods: length, size, substr, push, pop.
        const valueTypeMethods = ["length", "size", "substr", "push_back", "pop_back", "at"];

        // Also if we can identify it's a string identifier?
        // For now, let's assume if it looks like a standard method, use dot.
        // If it returns a compilation error, we might need a smarter way.
        // But `data.length()` failed because we used `->`.

        if (typeof expr.property === 'string' && valueTypeMethods.includes(expr.property)) {
            return `(${this.genExpression(expr.object)}).${expr.property}`;
        }

        return `(${this.genExpression(expr.object)})->${expr.property}`;
    }

    private getBuiltinLibraries(): string {
        return `
// --- Built-in Helpers ---
std::string _riri_input() {
    std::string s;
    std::getline(std::cin, s);
    return s;
}

std::string _riri_fetch(std::string url) {
    std::string cmd = "curl -s " + url;
    std::string result;
    char buffer[128];
    FILE* pipe = popen(cmd.c_str(), "r");
    if (!pipe) return "ERROR";
    while (!feof(pipe)) {
        if (fgets(buffer, 128, pipe) != NULL)
            result += buffer;
    }
    pclose(pipe);
    return result;
}

template <typename T>
void _riri_tprint(const std::vector<T>& vec) {
    std::cout << "+----------------+" << std::endl;
    std::cout << "| Index | Value  |" << std::endl;
    std::cout << "+----------------+" << std::endl;
    for (size_t i = 0; i < vec.size(); ++i) {
        std::cout << "| " << i << "\\t| " << vec[i] << "\\t|" << std::endl;
    }
    std::cout << "+----------------+" << std::endl;
}

// --- Built-in Tree Library ---

struct Node {
    int data;
    Node* left = nullptr;
    Node* right = nullptr;
    int height = 1; // For AVL

    Node(int val) : data(val) {}
};

struct BinaryTree {
    Node* root = nullptr;

    void insert(int val) {
        if (!root) {
            root = new Node(val);
            return;
        }
        // Simple level order or just random insert? 
        // For generic BinaryTree, let's just do BST-like insert for simplicity 
        // unless user manually builds it.
        // Actually, let's just provide manual node creation?
        // Or strictly strictly BST logic.
        // Let's make BinaryTree a base with manual attach capabilities? 
        // RiriLang is simple. Let's make 'BinaryTree' effectively a wrapper that defaults to BST-like insert
        // but exposes root.
        insertRec(root, val);
    }
    
    void insertRec(Node* node, int val) {
        if (val < node->data) {
            if (node->left) insertRec(node->left, val);
            else node->left = new Node(val);
        } else {
            if (node->right) insertRec(node->right, val);
            else node->right = new Node(val);
        }
    }

    void printInOrder() {
        printInOrderRec(root);
        std::cout << std::endl;
    }

    void printInOrderRec(Node* node) {
        if (!node) return;
        printInOrderRec(node->left);
        std::cout << node->data << " ";
        printInOrderRec(node->right);
    }
};

struct BST : public BinaryTree {
    // Inherits insert and print from BinaryTree (which is basically a BST logic above)
    bool search(int val) {
        return searchRec(root, val);
    }

    bool searchRec(Node* node, int val) {
        if (!node) return false;
        if (node->data == val) return true;
        if (val < node->data) return searchRec(node->left, val);
        return searchRec(node->right, val);
    }
};

struct AVL {
    Node* root = nullptr;

    int height(Node* N) {
        if (N == nullptr) return 0;
        return N->height;
    }

    int max(int a, int b) {
        return (a > b) ? a : b;
    }

    Node* rightRotate(Node* y) {
        Node* x = y->left;
        Node* T2 = x->right;
        x->right = y;
        y->left = T2;
        y->height = max(height(y->left), height(y->right)) + 1;
        x->height = max(height(x->left), height(x->right)) + 1;
        return x;
    }

    Node* leftRotate(Node* x) {
        Node* y = x->right;
        Node* T2 = y->left;
        y->left = x;
        x->right = T2;
        x->height = max(height(x->left), height(x->right)) + 1;
        y->height = max(height(y->left), height(y->right)) + 1;
        return y;
    }

    int getBalance(Node* N) {
        if (N == nullptr) return 0;
        return height(N->left) - height(N->right);
    }

    Node* insertRec(Node* node, int data) {
        if (node == nullptr) return new Node(data);
        if (data < node->data) node->left = insertRec(node->left, data);
        else if (data > node->data) node->right = insertRec(node->right, data);
        else return node; // Equal keys not allowed

        node->height = 1 + max(height(node->left), height(node->right));
        int balance = getBalance(node);

        // Left Left
        if (balance > 1 && data < node->left->data) return rightRotate(node);
        // Right Right
        if (balance < -1 && data > node->right->data) return leftRotate(node);
        // Left Right
        if (balance > 1 && data > node->left->data) {
            node->left = leftRotate(node->left);
            return rightRotate(node);
        }
        // Right Left
        if (balance < -1 && data < node->right->data) {
            node->right = rightRotate(node->right);
            return leftRotate(node);
        }
        return node;
    }

    void insert(int val) {
        root = insertRec(root, val);
    }

    void printInOrder() {
        printInOrderRec(root);
        std::cout << std::endl;
    }

    void printInOrderRec(Node* node) {
        if (!node) return;
        printInOrderRec(node->left);
        std::cout << node->data << " ";
        printInOrderRec(node->right);
    }
};

struct Heap {
    std::vector<int> data;

    void push(int val) {
        data.push_back(val);
        std::push_heap(data.begin(), data.end()); // Max heap by default
    }

    int pop() {
        if (data.empty()) return -1; // Error
        std::pop_heap(data.begin(), data.end());
        int val = data.back();
        data.pop_back();
        return val;
    }

    int top() {
        if (data.empty()) return -1;
        return data.front();
    }
    
    void print() {
        for (int i : data) std::cout << i << " ";
        std::cout << std::endl;
    }
};

// ---------------------------
`;
    }
}
