"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerator = void 0;
const ast_1 = require("./ast");
class CodeGenerator {
    constructor(program) {
        this.program = program;
    }
    generate() {
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
        const classes = [];
        const functions = [];
        const mainBody = [];
        for (const stmt of this.program.body) {
            if (stmt.kind === ast_1.NodeType.ClassDeclaration) {
                classes.push(this.genClassDeclaration(stmt));
            }
            else if (stmt.kind === ast_1.NodeType.FunctionDeclaration) {
                // Functions usually return 'auto' in our system
                functions.push(this.genFuncDeclaration(stmt));
            }
            else {
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
    genStatement(stmt) {
        switch (stmt.kind) {
            case ast_1.NodeType.VariableDeclaration:
                return this.genVarDeclaration(stmt);
            case ast_1.NodeType.FunctionDeclaration:
                return this.genFuncDeclaration(stmt);
            case ast_1.NodeType.ReturnStatement:
                return this.genReturnStatement(stmt);
            case ast_1.NodeType.IfStatement:
                return this.genIfStatement(stmt);
            case ast_1.NodeType.WhileStatement:
                return this.genWhileStatement(stmt);
            case ast_1.NodeType.ForStatement:
                return this.genForStatement(stmt);
            case ast_1.NodeType.ExpressionStatement:
                return this.genExprStatement(stmt);
            case ast_1.NodeType.SwitchStatement:
                return this.genSwitchStatement(stmt);
            case ast_1.NodeType.BreakStatement:
                return "break;\n";
            default:
                throw new Error(`Unknown statement kind: ${stmt.kind}`);
        }
    }
    genVarDeclaration(stmt) {
        if (!stmt.value) {
            return `int ${stmt.identifier};\n`;
        }
        return `auto ${stmt.identifier} = ${this.genExpression(stmt.value)};\n`;
    }
    genFuncDeclaration(stmt) {
        // Use C++20 auto template parameters
        const params = stmt.params.map(p => `auto ${p}`).join(", ");
        // Return type 'auto'
        let body = "{\n";
        for (const s of stmt.body) {
            body += this.genStatement(s);
        }
        body += "}\n\n";
        return `auto ${stmt.name}(${params}) ${body}`;
    }
    genReturnStatement(stmt) {
        return `return ${this.genExpression(stmt.value)};\n`;
    }
    genIfStatement(stmt) {
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
    genWhileStatement(stmt) {
        let code = `while (${this.genExpression(stmt.condition)}) {\n`;
        for (const s of stmt.body) {
            code += this.genStatement(s);
        }
        code += "}\n";
        return code;
    }
    genForStatement(stmt) {
        let code = "for (";
        if (stmt.init) {
            // Warning: genStatement returns string with newline/semicolon usually.
            // We need to strip newline for for-loop header if it adds one.
            // genVarDeclaration adds ';\n'.
            code += this.genStatement(stmt.init).trim();
        }
        else {
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
    genExprStatement(stmt) {
        return `${this.genExpression(stmt.expression)};\n`;
    }
    // --- Expressions ---
    genExpression(expr) {
        switch (expr.kind) {
            case ast_1.NodeType.BinaryExpression:
                return this.genBinaryExpr(expr);
            case ast_1.NodeType.CallExpression:
                return this.genCallExpr(expr);
            case ast_1.NodeType.MemberExpression:
                return this.genMemberExpr(expr);
            case ast_1.NodeType.NewExpression:
                return this.genNewExpr(expr);
            case ast_1.NodeType.ThisExpression:
                return "this";
            case ast_1.NodeType.Identifier:
                return expr.symbol;
            case ast_1.NodeType.NumericLiteral:
                return expr.value.toString();
            case ast_1.NodeType.StringLiteral:
                return `std::string("${expr.value}")`;
            case ast_1.NodeType.ArrayLiteral:
                return this.genArrayLiteral(expr);
            default:
                throw new Error(`Unknown expression kind: ${expr.kind}`);
        }
    }
    genBinaryExpr(expr) {
        return `${this.genExpression(expr.left)} ${expr.operator} ${this.genExpression(expr.right)}`;
    }
    genArrayLiteral(expr) {
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
    genCallExpr(expr) {
        // Check if it is a console.log call
        // 1. Direct identifier "console.log" (if parser somehow allowed it, unlikely with dot)
        // 2. MemberExpression console . log
        let isConsoleLog = false;
        let isMathCall = false;
        let mathFunc = "";
        if (expr.callee.kind === ast_1.NodeType.Identifier && expr.callee.symbol === "console.log") {
            isConsoleLog = true;
        }
        else if (expr.callee.kind === ast_1.NodeType.MemberExpression) {
            const member = expr.callee;
            if (member.object.kind === ast_1.NodeType.Identifier) {
                const objName = member.object.symbol;
                if (objName === "console" && member.property === "log") {
                    isConsoleLog = true;
                }
                else if (objName === "Math") {
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
        const args = expr.args.map(a => this.genExpression(a)).join(", ");
        return `${callee}(${args})`;
    }
    genSwitchStatement(stmt) {
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
    genClassDeclaration(stmt) {
        let code = `struct ${stmt.name} {\n`;
        for (const field of stmt.fields) {
            let type = "int";
            if (field.value && field.value.kind === ast_1.NodeType.StringLiteral) {
                type = "std::string";
            }
            if (field.value) {
                code += `${type} ${field.identifier} = ${this.genExpression(field.value)};\n`;
            }
            else {
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
    genNewExpr(expr) {
        const args = expr.args.map(a => this.genExpression(a)).join(", ");
        return `new ${expr.className}(${args})`; // C++ new returns pointer
    }
    genMemberExpr(expr) {
        if (expr.computed) {
            return `${this.genExpression(expr.object)}[${this.genExpression(expr.property)}]`;
        }
        return `(${this.genExpression(expr.object)})->${expr.property}`;
    }
    getBuiltinLibraries() {
        return `
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
exports.CodeGenerator = CodeGenerator;
