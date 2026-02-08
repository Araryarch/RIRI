
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
    AssignmentExpression,
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
    UnaryExpression,
    ArrowFunctionExpression,
    ConditionalExpression,
    NodeType
} from "./ast";

export class CodeGenerator {
    private program: Program;
    private options: { qt?: boolean };

    constructor(program: Program, options: { qt?: boolean } = {}) {
        this.program = program;
        this.options = options;
    }

    public generate(): string {
        let cppCode = "#include <iostream>\n#include <vector>\n#include <string>\n#include <functional>\n#include <cmath>\n#include <algorithm>\n#include <cstdlib>\n#include <ctime>\n#include <stdexcept>\n#include <queue>\n#include <stack>\n#include <map>\n#include <unordered_map>\n#include <set>\n#include <regex>\n#include <memory>\n#include <sstream>\n#include \"httplib.h\"\n";

        if (this.options.qt) {
            cppCode += "#include <QApplication>\n#include <QPushButton>\n#include <QLabel>\n#include <QVBoxLayout>\n#include <QWidget>\n#include <QLineEdit>\n";
            cppCode += `
void qt_connect(std::shared_ptr<QPushButton> btn, std::string signal, std::function<void()> callback) {
    if (signal == "clicked" && btn) {
        QObject::connect(btn.get(), &QPushButton::clicked, callback);
    }
}
// Helper macros and includes for Qt DOM
QString qt_str(std::string s) { return QString::fromStdString(s); }
std::string qt_to_std(QString s) { return s.toStdString(); }
template<typename T>
T* qt_raw(std::shared_ptr<T> p) { return p.get(); }

// --- DOM Implementation ---

// Base wrapper for any Qt element
struct QtElement {
    std::shared_ptr<QWidget> widget;
    std::shared_ptr<QLayout> layout; // Optional layout if it's a container
    std::string tagName;

    QtElement(std::string tag) : tagName(tag) {}

    void setAttribute(std::string key, std::string value) {
        if (!widget) return;
        if (key == "text") {
            // Check type and set text
            auto btn = std::dynamic_pointer_cast<QPushButton>(widget);
            if (btn) btn->setText(QString::fromStdString(value));
            auto lbl = std::dynamic_pointer_cast<QLabel>(widget);
            if (lbl) lbl->setText(QString::fromStdString(value));
            auto inp = std::dynamic_pointer_cast<QLineEdit>(widget);
            if (inp) inp->setText(QString::fromStdString(value));
            auto win = std::dynamic_pointer_cast<QWidget>(widget);
            if (win) win->setWindowTitle(QString::fromStdString(value)); // 'text' on generic widget sets title? Or introduce 'title' attr?
        }
        if (key == "title") {
             widget->setWindowTitle(QString::fromStdString(value));
        }
        if (key == "style") {
            widget->setStyleSheet(QString::fromStdString(value));
        }
    }

    void addEventListener(std::string event, std::function<void()> callback) {
        if (!widget) return;
        if (event == "click") {
            auto btn = std::dynamic_pointer_cast<QPushButton>(widget);
            if (btn) QObject::connect(btn.get(), &QPushButton::clicked, callback);
        }
        // Add more events as needed
    }

    void appendChild(std::shared_ptr<QtElement> child) {
        if (!widget || !child || !child->widget) return;
        
        // If this element has a layout, add child to layout
        if (layout) {
            layout->addWidget(child->widget.get());
        } else {
            // If no layout, simply set parent (absolute positioning or non-container)
            // But usually we want layout. 
            // If it's a "div" without layout initialized? 
            // We initialize layout lazily or in constructor.
            child->widget->setParent(widget.get());
            child->widget->show(); // Ensure visibility
        }
    }

    void show() {
        if (widget) widget->show();
    }
};

struct Document {
    std::shared_ptr<QtElement> createElement(std::string tag) {
        auto el = std::make_shared<QtElement>(tag);
        
        if (tag == "div") {
            auto w = std::make_shared<QWidget>();
            el->widget = w;
            el->layout = std::make_shared<QVBoxLayout>(w.get()); // Default vertical layout
        } else if (tag == "span") { // Horizontal container
             auto w = std::make_shared<QWidget>();
            el->widget = w;
            el->layout = std::make_shared<QHBoxLayout>(w.get());
        } else if (tag == "button") {
            el->widget = std::make_shared<QPushButton>();
        } else if (tag == "label") {
            el->widget = std::make_shared<QLabel>();
        } else if (tag == "input") {
            el->widget = std::make_shared<QLineEdit>();
        } else if (tag == "window") {
             auto w = std::make_shared<QWidget>();
             el->widget = w;
             el->layout = std::make_shared<QVBoxLayout>(w.get());
             w->resize(400, 300); // Default size
        }
        
        return el;
    }
};

// Global document instance
// Accessible in Riri as 'document' via code gen mapping?
// Or we just instantiate 'Document document;' in main?
// No, Riri code needs to access it. 
// We will modify main() generation or provide a "getDocument()" built-in.
// Simpler: Just allow user to 'let document = new Document();' 
// But Document state?
// Let's make Document struct have no state, just factory methods.
`;
        }

        cppCode += "\n";

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
        cppCode += "std::srand(std::time(0));\n";
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
            case NodeType.ClassDeclaration:
                return this.genClassDeclaration(stmt as ClassDeclaration);
            default:
                // Only throw if strictly unknown and unhandled.
                // But we see it didn't throw before? Maybe switch covered it?
                // Or maybe parser returned FunctionDeclaration for class? No.
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
        if (!stmt.value) return "return;\n";
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

    private genClassDeclaration(stmt: ClassDeclaration): string {
        let code = `struct ${stmt.name} {\n`;

        // Fields
        for (const f of stmt.fields) {
            if (f.value) {
                let type = "int";
                const val = f.value;
                if (val.kind === NodeType.StringLiteral) type = "std::string";
                else if (val.kind === NodeType.ArrayLiteral) type = "std::vector<std::string>";
                else if (val.kind === NodeType.NumericLiteral) {
                    if ((val as NumericLiteral).value.toString().includes(".")) type = "double";
                }
                else if (val.kind === NodeType.NewExpression) type = `std::shared_ptr<${(val as NewExpression).className}>`;
                else if (val.kind === NodeType.Identifier) {
                    const s = (val as Identifier).symbol;
                    if (s === "true" || s === "false") type = "bool";
                }
                code += `    ${type} ${f.identifier} = ${this.genExpression(val)};\n`;
            } else {
                code += `    int ${f.identifier};\n`;
            }
        }

        // Methods
        for (const m of stmt.methods) {
            const params = m.params.map((p: any) => `auto ${p}`).join(", ");
            let body = "{\n";
            for (const s of m.body) {
                body += this.genStatement(s);
            }
            body += "}\n";
            code += `    auto ${m.name}(${params}) ${body}`;
        }

        code += "};\n";
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
            case NodeType.AssignmentExpression:
                return this.genAssignmentExpr(expr as AssignmentExpression);
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
                // Generate await for async operations
                const awaitArg = this.genExpression((expr as AwaitExpression).argument);
                // If it's a future/async task, use await_result
                if (awaitArg.includes('async_task')) {
                    return `await_result(${awaitArg})`;
                }
                // Otherwise just return the expression (blocking call)
                return awaitArg;
            case NodeType.UnaryExpression:
                return `(${(expr as any).operator}${this.genExpression((expr as any).argument)})`;
            case NodeType.ArrowFunctionExpression:
                return this.genArrowFunction(expr as ArrowFunctionExpression);
            case NodeType.ConditionalExpression:
                const cond = expr as ConditionalExpression;
                return `(${this.genExpression(cond.test)} ? ${this.genExpression(cond.consequent)} : ${this.genExpression(cond.alternate)})`;
            default:
                throw new Error(`Unknown expression kind: ${expr.kind}`);
        }
    }

    private genArrowFunction(expr: ArrowFunctionExpression): string {
        // [=](auto p1, ...) { ... }
        // Capture by value [=] is safer for local vars (args).
        // For shared state, user must use Objects (classes) which are pointers.

        const params = expr.params
            .filter((p: any) => p !== "next") // Remove 'next' - httplib doesn't support it
            .map((p: any) => {
                if (p === "req") return "const httplib::Request& req";
                if (p === "res") return "httplib::Response& res";
                return `auto ${p}`;
            })
            .join(", ");

        let body = "{\n";

        // Check if body is an array of statements or a single expression
        if (Array.isArray(expr.body)) {
            for (const s of expr.body) {
                body += this.genStatement(s);
            }
        } else {
            // Single expression body - wrap in return statement
            body += `return ${this.genExpression(expr.body)};\n`;
        }

        // If original params included 'next', this is middleware - return Unhandled
        if (expr.params.includes("next")) {
            body += "return httplib::Server::HandlerResponse::Unhandled;\n";
        }

        body += "}";

        return `[=](${params}) ${body}`;
    }

    private genIndexExpr(expr: MemberExpression): string {
        const objExp = this.genExpression(expr.object);
        const indexExp = this.genExpression(expr.property as Expression);

        // Check if accessing URL params or Query params
        // This relies on detecting the generated code pattern "req.path_params" or "req.params"
        // But objExp is the generated string! "req.path_params"

        if (objExp.includes(".path_params")) { // req.params
            return `_riri_get_param(${objExp}, ${indexExp})`;
        }
        if (objExp.includes(".params") && !objExp.includes("path_params")) { // req.query (exclude path_params)
            return `_riri_get_query(${objExp}, ${indexExp})`;
        }

        return `${objExp}[${indexExp}]`;
    }

    private genAssignmentExpr(expr: AssignmentExpression): string {
        const left = this.genExpression(expr.assignee);
        const right = this.genExpression(expr.value);
        return `${left} = ${right}`;
    }

    private genBinaryExpr(expr: BinaryExpression): string {
        return `${this.genExpression(expr.left)} ${expr.operator} ${this.genExpression(expr.right)}`;
    }

    private genArrayLiteral(expr: ArrayLiteral): string {
        const elements = expr.elements.map(e => this.genExpression(e)).join(", ");

        let type = "int";
        if (expr.elements.length > 0) {
            const first = expr.elements[0];
            if (first.kind === NodeType.StringLiteral) {
                type = "std::string";
            }
        }

        return `std::vector<${type}>{${elements}}`;
    }

    private genCallExpr(expr: CallExpression): string {
        // Check if it is a console.log call
        // 1. Direct identifier "console.log" (if parser somehow allowed it, unlikely with dot)
        // 2. MemberExpression console . log

        let isMathCall = false;
        let mathFunc = "";

        if (expr.callee.kind === NodeType.MemberExpression) {
            const member = expr.callee as MemberExpression;
            if (member.object.kind === NodeType.Identifier) {
                const objName = (member.object as Identifier).symbol;
                if (objName === "Math") {
                    isMathCall = true;
                    if (member.property === "random") {
                        mathFunc = "((double)std::rand() / (RAND_MAX))";
                    } else {
                        mathFunc = `std::${member.property}`;
                    }
                }
            }
        }

        if (isMathCall) {
            if (mathFunc.includes("rand")) {
                return mathFunc;
            }
            const args = expr.args.map(a => this.genExpression(a)).join(", ");
            return `${mathFunc}(${args})`;
        }

        const callee = this.genExpression(expr.callee);

        if (callee === "print") {
            const printArgs = expr.args.map(a => this.genExpression(a)).join(" << \" \" << ");
            return `std::cout << ${printArgs} << std::endl`;
        }

        // Support console.table -> tprint
        // Handled below in MemberExpression check

        if (callee === "input") {
            return `_riri_input()`;
        }

        if (callee === "input") {
            return `_riri_input()`;
        }

        // Check for specific member expressions like console.table
        if (expr.callee.kind === NodeType.MemberExpression) {
            const member = expr.callee as MemberExpression;
            if (member.object.kind === NodeType.Identifier) {
                const obj = (member.object as Identifier).symbol;
                if (obj === "console" && member.property === "table") {
                    const args = expr.args.map(a => this.genExpression(a)).join(", ");
                    return `_riri_tprint(${args});\n`;
                }
            }
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

        if (callee === "sort") {
            const arg = this.genExpression(expr.args[0]);
            return `std::sort(${arg}.begin(), ${arg}.end())`;
        } else if (callee === "string") {
            const arg = this.genExpression(expr.args[0]);
            return `std::to_string(${arg})`;
        } else if (callee === "float") {
            const arg = this.genExpression(expr.args[0]);
            return `std::stod(${arg})`;
        } else if (callee === "rand") {
            return `std::rand()`;
        } else if (callee === "delay") {
            // delay(milliseconds) - sleep for specified time
            const arg = this.genExpression(expr.args[0]);
            return `delay(${arg})`;
        }

        if (!expr.callee) {
            throw new Error("CallExpression missing callee");
        }

        // Handle .push() and .pop() specifically to support both Vectors and Heaps
        if (expr.callee.kind === NodeType.MemberExpression) {
            const member = expr.callee as MemberExpression;
            const method = member.property;

            // Special case: length() - genMemberExpr already adds ()
            if (method === "length") {
                // genMemberExpr returns obj.size() already
                return this.genMemberExpr(member);
            }

            // Array methods with callbacks
            if (method === "map") {
                const obj = this.genExpression(member.object);
                const callback = this.genExpression(expr.args[0]);
                return `_riri_map(${obj}, ${callback})`;
            }
            if (method === "filter") {
                const obj = this.genExpression(member.object);
                const callback = this.genExpression(expr.args[0]);
                return `_riri_filter(${obj}, ${callback})`;
            }
            if (method === "forEach") {
                const obj = this.genExpression(member.object);
                const callback = this.genExpression(expr.args[0]);
                return `_riri_forEach(${obj}, ${callback})`;
            }
            if (method === "reduce") {
                const obj = this.genExpression(member.object);
                const callback = this.genExpression(expr.args[0]);
                const initial = this.genExpression(expr.args[1]);
                return `_riri_reduce(${obj}, ${callback}, ${initial})`;
            }
            if (method === "slice") {
                const obj = this.genExpression(member.object);
                const start = this.genExpression(expr.args[0]);
                const end = expr.args[1] ? this.genExpression(expr.args[1]) : "-1";
                return `_riri_slice(${obj}, ${start}, ${end})`;
            }
            if (method === "indexOf") {
                const obj = this.genExpression(member.object);
                const value = this.genExpression(expr.args[0]);
                return `_riri_indexOf(${obj}, ${value})`;
            }
            if (method === "includes") {
                const obj = this.genExpression(member.object);
                const value = this.genExpression(expr.args[0]);
                return `_riri_includes(${obj}, ${value})`;
            }
            if (method === "join") {
                const obj = this.genExpression(member.object);
                const sep = expr.args[0] ? this.genExpression(expr.args[0]) : '","';
                return `_riri_join(${obj}, ${sep})`;
            }
            if (method === "concat") {
                const obj = this.genExpression(member.object);
                const other = this.genExpression(expr.args[0]);
                return `_riri_concat(${obj}, ${other})`;
            }
            if (method === "reverse") {
                const obj = this.genExpression(member.object);
                return `_riri_reverse(${obj})`;
            }

            // String methods
            if (method === "split") {
                const obj = this.genExpression(member.object);
                const delimiter = this.genExpression(expr.args[0]);
                return `_riri_split(${obj}, ${delimiter})`;
            }
            if (method === "toLowerCase") {
                const obj = this.genExpression(member.object);
                return `_riri_toLowerCase(${obj})`;
            }
            if (method === "toUpperCase") {
                const obj = this.genExpression(member.object);
                return `_riri_toUpperCase(${obj})`;
            }
            if (method === "trim") {
                const obj = this.genExpression(member.object);
                return `_riri_trim(${obj})`;
            }
            if (method === "parseInt") {
                const arg = this.genExpression(expr.args[0]);
                return `_riri_parseInt(${arg})`;
            }
            if (method === "parseFloat") {
                const arg = this.genExpression(expr.args[0]);
                return `_riri_parseFloat(${arg})`;
            }

            // Server methods
            if (method === "listen") {
                const port = this.genExpression(expr.args[0]);
                return `${this.genExpression(member.object)}->listen("0.0.0.0", ${port})`;
            }

            if (typeof method === 'string' && ["get", "post", "put", "delete"].includes(method)) {
                // app.get("/", (req, res) => { ... })
                // Only if 2 args and first is string? 
                // Simple check: args.length == 2.
                // Tic Tac Toe uses .get() on map/vector likely with 1 or 0 args? Or 2?
                // If 2 args, it might still collide.
                // We should check if object appears to be a Server?
                // Or if method is exactly one of these AND args[0] is string literal?

                if (expr.args.length === 2) {
                    const path = this.genExpression(expr.args[0]);
                    const callback = this.genExpression(expr.args[1]);

                    // Capitalize method for httplib: Get, Post, Put, Delete
                    const httpMethod = method.charAt(0).toUpperCase() + method.slice(1);
                    return `${this.genExpression(member.object)}->${httpMethod}(${path}, ${callback})`;
                }
            }

            if (method === "use") {
                // app.use((req, res, next) => { ... })
                // httplib set_pre_routing_handler
                const callback = this.genExpression(expr.args[0]);
                return `${this.genExpression(member.object)}->set_pre_routing_handler(${callback})`;
            }

            // Response methods (res.send, res.json)
            // We assume object is 'res' or similar (mostly checking method name for now)
            if (method === "send") {
                // res.send(body) -> res.set_content(body, "text/plain")
                const body = this.genExpression(expr.args[0]);
                return `${this.genExpression(member.object)}.set_content(${body}, "text/plain")`;
            }
            if (method === "json") {
                const body = this.genExpression(expr.args[0]);
                return `${this.genExpression(member.object)}.set_content(${body}, "application/json")`;
            }
            if (method === "status") {
                const code = this.genExpression(expr.args[0]);
                return `${this.genExpression(member.object)}.status = ${code}`;
            }

            if (member.property === "push") {
                // riri_push(obj, val)
                const obj = this.genExpression(member.object);
                const arg = this.genExpression(expr.args[0]);
                return `_riri_push(${obj}, ${arg})`;
            }
            if (member.property === "pop") {
                // riri_pop(obj)
                const obj = this.genExpression(member.object);
                return `_riri_pop(${obj})`;
            }
        }

        if (expr.callee.kind === NodeType.MemberExpression) {
            const member = expr.callee as MemberExpression;
            // ... (previous logic for push/Server methods)

            // Map methods on values (req.query.count)
            const objExp = this.genExpression(member.object);
            if (member.property === "count" || member.property === "find") {
                if (objExp.endsWith(".params") || objExp.endsWith(".path_params")) {
                    const args = expr.args.map(a => this.genExpression(a)).join(", ");
                    return `${objExp}.${member.property}(${args})`;
                }
            }
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


    private genNewExpr(expr: NewExpression): string {
        const args = expr.args.map(a => this.genExpression(a)).join(", ");

        if (expr.className === "Server") {
            // httplib::Server is huge, use shared_ptr
            return `std::make_shared<httplib::Server>()`;
        }

        // Use std::make_shared for ARC
        return `std::make_shared<${expr.className}>(${args})`;
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
                // Generate: catch (const std::exception& e) { std::string e_msg = e.what(); ... }
                // We map the user identifier to a local string variable containing .what()
                // Because users might want to print(e).
                code += `catch (const std::exception& _e) {\n`;
                code += `std::string ${stmt.catchParam} = _e.what();\n`;
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
            return this.genIndexExpr(expr);
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

        // Helper to check if it's a known value type (string or vector)
        // This is tricky without full type info.
        // We can check if the method is unique to value types?
        // std::vector has push_back, pop_back.
        // String has length, substr.
        // Heap has push, pop.

        // If it is 'push' or 'pop', it might be Heap (pointer) or Vector (value).
        // Riri array methods are push/pop, mapped to push_back/pop_back for vector.
        // But Heap struct has push/pop methods.

        if (expr.property === "push" || expr.property === "pop") {
            // It could be array or Heap.
            // If it's Heap (User defined struct in C++), it is a pointer -> use ->
            // If it's Array (std::vector), it is value -> use . and map to push_back/pop_back

            // HACK: Check if the variable name implies it's a heap/tree? 
            // Or check if it was defined with 'new'?
            // We can't know for sure here.

            // Let's try to map `push` -> `push_back` ONLY if we are sure it is a vector?
            // Or providing a polyfill?
            // Let's change the C++ `Heap` struct to use `push_back`? No, standard is `push`.

            // Let's assume `push` on a bare identifier that isn't `new`ed is a vector?
            // `let arr = [...]` -> value.
            // `let h = new Heap()` -> pointer.

            // Refined heuristic:
            // If we use `.` it must be a value.
            // If we use `->` it must be a pointer.

            // If the property is `push` or `pop`:
            // 1. If it's a vector, we want `.push_back`.
            // 2. If it's a heap (ptr), we want `->push`.

            // Can we compile `t.push` (dot) on a pointer? No. 
            // Can we compile `t->push_back` on a vector? No.

            // Let's blindly try to support Riri `push` for both.
            // But we need to distinguish.
            // What if we rename Heap methods to `insert` / `remove` to avoid collision? 
            // Or what if we make Heap a value type?

            // Structs are allocated with `new` -> returns pointer.
            // Vectors are `std::vector` -> value.

            // Let's check `expr.object`.
            // If `expr.object` is a `NewExpression`, it's a pointer.
            // If it is an `ArrayLiteral`, it's a value.
            // If it is an Identifier... hard.

            // Alternative:
            // Change Vector to use `append` and `removeLast`?
            // Or change Heap to `add` / `poll`?

            // Let's change Heap methods in implicit lib to `add` and `poll` to avoid collision with standard vector push/pop concept?
            // But `full_docs.rr` uses `push`.

            // Okay, let's keep it simple:
            // Force `push` -> `push_back` for vectors.
            // But `Heap` is a struct.
            // What if we generate a template helper `riri_push(obj, val)`?
            // C++ overloading!

            // Great idea.
            // `riri_push(vec, val)` -> vec.push_back(val)
            // `riri_push(heap, val)` -> heap->push(val)

            // But `genCallExpr` handles the call `obj.push(x)`.
            // It currently transforms to `obj.push(x)` or `obj->push(x)`.

            // If we change `genMemberExpr` to returns a string...
            // If we use the helper `riri_push`, we need to change `genCallExpr`, not `genMemberExpr` (mostly).

            // Let's modify `genCallExpr` to intercept `push` and `pop`.

            return `(${this.genExpression(expr.object)})->${expr.property}`;
        }

        // Handle array.length, string.length, vector.size
        const valueTypeMethods = ["length", "size", "substr", "at", "push_back", "pop_back"];

        if (typeof expr.property === 'string' && valueTypeMethods.includes(expr.property)) {
            if (expr.property === "length") {
                // Arrays/Vectors in C++ use .size()
                // Strings use .length() or .size()
                // In JavaScript, .length is a property, but in C++ it's a method
                // So we always return with () since C++ needs it
                return `${this.genExpression(expr.object)}.size()`;
            }

            return `${this.genExpression(expr.object)}.${expr.property}`;
        }

        // Express-like mappings
        if (expr.property === "params") {
            // req.params -> req.path_params
            return `${this.genExpression(expr.object)}.path_params`;
        }
        if (expr.property === "query") {
            // req.query -> req.params (httplib nomenclature)
            return `${this.genExpression(expr.object)}.params`;
        }

        // HACK: If we are accessing .count() on a map (params/query), use dot.
        // genExpression returns "req.params" (which is value)
        if (expr.property === "count") {
            const objExp = this.genExpression(expr.object);
            if (objExp.endsWith(".params") || objExp.endsWith(".path_params")) {
                return `(${objExp})`; // Return value, genCallExpr handles the call ???
                // Wait, genCallExpr calls genMemberExpr?
                // NO, genCallExpr INSPECTS callee.
                // If callee is member expression.
                // It gets object.
                // It returns `object->method`.
                // We need to change genCallExpr logic.
            }
        }

        // Default pointer access
        return `(${this.genExpression(expr.object)})->${expr.property}`;
    }

    // NOTE: genCallExpr handles the method invocation syntax `->` vs `.`
    // We need to update genCallExpr logic separately.

    private getBuiltinLibraries(): string {
        return `
// --- Built-in Helpers ---

// Async/Await support
#include <thread>
#include <chrono>
#include <future>

template<typename Func>
auto async_task(Func&& func) {
    return std::async(std::launch::async, std::forward<Func>(func));
}

void delay(int milliseconds) {
    std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
}

template<typename T>
T await_result(std::future<T>& future) {
    return future.get();
}

// Helper to get from multimap (query)
std::string _riri_get_query(const std::multimap<std::string, std::string>& m, std::string key) {
    auto it = m.find(key);
    if (it != m.end()) return it->second;
    return "";
}

// Helper to get from map (path params)
std::string _riri_get_param(const std::unordered_map<std::string, std::string>& m, std::string key) {
    if (m.count(key)) return m.at(key);
    return "";
}

std::string _riri_input() {
    std::string s;
    std::getline(std::cin, s);
    return s;
}

// Overloads for push/pop to handle both std::vector (value) and Heap* (pointer)

// Vector push
template <typename T>
void _riri_push(std::vector<T>& vec, T val) {
    vec.push_back(val);
}

// Heap/Object pointer push (raw)
template <typename T>
void _riri_push(T* obj, int val) {
    obj->push(val);
}

// Heap/Object shared_ptr push
template <typename T>
void _riri_push(std::shared_ptr<T> obj, int val) {
    obj->push(val);
}

// Vector pop
template <typename T>
T _riri_pop(std::vector<T>& vec) {
    if (vec.empty()) return T(); // Return default
    T val = vec.back();
    vec.pop_back();
    return val;
}

// Heap/Object pointer pop (raw)
template <typename T>
int _riri_pop(T* obj) {
    return obj->pop();
}

// Heap/Object shared_ptr pop
template <typename T>
int _riri_pop(std::shared_ptr<T> obj) {
    return obj->pop();
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

// JavaScript-like array methods
template<typename T, typename Func>
std::vector<T> _riri_map(const std::vector<T>& vec, Func callback) {
    std::vector<T> result;
    for (size_t i = 0; i < vec.size(); i++) {
        result.push_back(callback(vec[i]));
    }
    return result;
}

template<typename T, typename Func>
std::vector<T> _riri_filter(const std::vector<T>& vec, Func callback) {
    std::vector<T> result;
    for (size_t i = 0; i < vec.size(); i++) {
        if (callback(vec[i])) {
            result.push_back(vec[i]);
        }
    }
    return result;
}

template<typename T>
std::vector<T> _riri_slice(const std::vector<T>& vec, int start, int end = -1) {
    if (end == -1) end = vec.size();
    if (start < 0) start = vec.size() + start;
    if (end < 0) end = vec.size() + end;
    if (start < 0) start = 0;
    if (end > (int)vec.size()) end = vec.size();
    if (start >= end) return std::vector<T>();
    return std::vector<T>(vec.begin() + start, vec.begin() + end);
}

template<typename T, typename Func>
void _riri_forEach(const std::vector<T>& vec, Func callback) {
    for (size_t i = 0; i < vec.size(); i++) {
        callback(vec[i], i);
    }
}

template<typename T, typename Func>
T _riri_reduce(const std::vector<T>& vec, Func callback, T initial) {
    T result = initial;
    for (size_t i = 0; i < vec.size(); i++) {
        result = callback(result, vec[i], i);
    }
    return result;
}

template<typename T>
int _riri_indexOf(const std::vector<T>& vec, T value) {
    for (size_t i = 0; i < vec.size(); i++) {
        if (vec[i] == value) return i;
    }
    return -1;
}

template<typename T>
bool _riri_includes(const std::vector<T>& vec, T value) {
    return _riri_indexOf(vec, value) != -1;
}

template<typename T>
std::vector<T> _riri_concat(const std::vector<T>& vec1, const std::vector<T>& vec2) {
    std::vector<T> result = vec1;
    result.insert(result.end(), vec2.begin(), vec2.end());
    return result;
}

template<typename T>
std::vector<T> _riri_reverse(std::vector<T> vec) {
    std::reverse(vec.begin(), vec.end());
    return vec;
}

template<typename T>
std::string _riri_join(const std::vector<T>& vec, std::string separator = ",") {
    if (vec.empty()) return "";
    std::ostringstream oss;
    oss << vec[0];
    for (size_t i = 1; i < vec.size(); i++) {
        oss << separator << vec[i];
    }
    return oss.str();
}

// String methods
std::vector<std::string> _riri_split(std::string str, std::string delimiter) {
    std::vector<std::string> result;
    size_t pos = 0;
    while ((pos = str.find(delimiter)) != std::string::npos) {
        result.push_back(str.substr(0, pos));
        str.erase(0, pos + delimiter.length());
    }
    result.push_back(str);
    return result;
}

std::string _riri_toLowerCase(std::string str) {
    std::transform(str.begin(), str.end(), str.begin(), ::tolower);
    return str;
}

std::string _riri_toUpperCase(std::string str) {
    std::transform(str.begin(), str.end(), str.begin(), ::toupper);
    return str;
}

std::string _riri_trim(std::string str) {
    str.erase(0, str.find_first_not_of(" \\t\\n\\r"));
    str.erase(str.find_last_not_of(" \\t\\n\\r") + 1);
    return str;
}

int _riri_parseInt(std::string str) {
    return std::stoi(str);
}

double _riri_parseFloat(std::string str) {
    return std::stod(str);
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
    std::shared_ptr<Node> left = nullptr;
    std::shared_ptr<Node> right = nullptr;
    int height = 1; // For AVL

    Node(int val) : data(val) {}
};

struct BinaryTree {
    std::shared_ptr<Node> root = nullptr;

    void insert(int val) {
        if (!root) {
            root = std::make_shared<Node>(val);
            return;
        }
        insertRec(root, val);
    }
    
    void insertRec(std::shared_ptr<Node> node, int val) {
        if (val < node->data) {
            if (node->left) insertRec(node->left, val);
            else node->left = std::make_shared<Node>(val);
        } else {
            if (node->right) insertRec(node->right, val);
            else node->right = std::make_shared<Node>(val);
        }
    }

    void printInOrder() {
        printInOrderRec(root);
        std::cout << std::endl;
    }

    void printInOrderRec(std::shared_ptr<Node> node) {
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

    bool searchRec(std::shared_ptr<Node> node, int val) {
        if (!node) return false;
        if (node->data == val) return true;
        if (val < node->data) return searchRec(node->left, val);
        return searchRec(node->right, val);
    }
};

struct AVL {
    std::shared_ptr<Node> root = nullptr;

    int height(std::shared_ptr<Node> N) {
        if (N == nullptr) return 0;
        return N->height;
    }

    int max(int a, int b) {
        return (a > b) ? a : b;
    }

    std::shared_ptr<Node> rightRotate(std::shared_ptr<Node> y) {
        std::shared_ptr<Node> x = y->left;
        std::shared_ptr<Node> T2 = x->right;
        x->right = y;
        y->left = T2;
        y->height = max(height(y->left), height(y->right)) + 1;
        x->height = max(height(x->left), height(x->right)) + 1;
        return x;
    }

    std::shared_ptr<Node> leftRotate(std::shared_ptr<Node> x) {
        std::shared_ptr<Node> y = x->right;
        std::shared_ptr<Node> T2 = y->left;
        y->left = x;
        x->right = T2;
        x->height = max(height(x->left), height(x->right)) + 1;
        y->height = max(height(y->left), height(y->right)) + 1;
        return y;
    }

    int getBalance(std::shared_ptr<Node> N) {
        if (N == nullptr) return 0;
        return height(N->left) - height(N->right);
    }

    std::shared_ptr<Node> insertRec(std::shared_ptr<Node> node, int data) {
        if (node == nullptr) return std::make_shared<Node>(data);
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

    void printInOrderRec(std::shared_ptr<Node> node) {
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

struct Graph {
    std::map<int, std::vector<std::pair<int, int>>> adj; // u -> [(v, w)]
    std::map<int, std::pair<int, int>> coords; // u -> (x, y)

    void add_edge(int u, int v, int w) {
        adj[u].push_back({v, w});
    }

    void set_pos(int u, int x, int y) {
        coords[u] = {x, y};
    }

    std::vector<int> bfs(int start) {
        std::vector<int> path;
        std::queue<int> q;
        std::set<int> visited;

        q.push(start);
        visited.insert(start);

        while (!q.empty()) {
            int u = q.front();
            q.pop();
            path.push_back(u);

            for (auto& edge : adj[u]) {
                int v = edge.first;
                if (visited.find(v) == visited.end()) {
                    visited.insert(v);
                    q.push(v);
                }
            }
        }
        return path;
    }

    std::vector<int> dfs(int start) {
        std::vector<int> path;
        std::stack<int> s;
        std::set<int> visited;

        s.push(start);

        while (!s.empty()) {
            int u = s.top();
            s.pop();

            if (visited.find(u) == visited.end()) {
                visited.insert(u);
                path.push_back(u);

                auto& neighbors = adj[u];
                for (auto it = neighbors.rbegin(); it != neighbors.rend(); ++it) {
                    int v = it->first;
                    if (visited.find(v) == visited.end()) {
                        s.push(v);
                    }
                }
            }
        }
        return path;
    }

    std::vector<int> dijkstra(int start, int end) {
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<std::pair<int, int>>> pq;
        std::map<int, int> dist;
        std::map<int, int> parent;

        dist[start] = 0;
        pq.push({0, start});
        
        while (!pq.empty()) {
            int d = pq.top().first;
            int u = pq.top().second;
            pq.pop();

            if (dist.find(u) != dist.end() && d > dist[u]) continue;
            if (u == end) break;

            for (auto& edge : adj[u]) {
                int v = edge.first;
                int weight = edge.second;

                bool is_inf = dist.find(v) == dist.end();
                if (is_inf || dist[u] + weight < dist[v]) {
                    dist[v] = dist[u] + weight;
                    parent[v] = u;
                    pq.push({dist[v], v});
                }
            }
        }

        std::vector<int> path;
        if (dist.find(end) == dist.end()) return path;

        int curr = end;
        while (curr != start) {
            path.push_back(curr);
            curr = parent[curr];
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());
        return path;
    }

    double heuristic(int u, int v) {
        if (coords.find(u) == coords.end() || coords.find(v) == coords.end()) return 0;
        int dx = coords[u].first - coords[v].first;
        int dy = coords[u].second - coords[v].second;
        return std::sqrt(dx*dx + dy*dy);
    }

    std::vector<int> astar(int start, int end) {
        std::priority_queue<std::pair<double, int>, std::vector<std::pair<double, int>>, std::greater<std::pair<double, int>>> pq;
        std::map<int, int> g_score;
        std::map<int, int> parent;
        
        g_score[start] = 0;
        pq.push({0 + heuristic(start, end), start});

        while (!pq.empty()) {
            int u = pq.top().second;
            pq.pop();

            if (u == end) break;

            for (auto& edge : adj[u]) {
                int v = edge.first;
                int weight = edge.second;

                int tentative_g = g_score[u] + weight;
                bool is_inf = g_score.find(v) == g_score.end();

                if (is_inf || tentative_g < g_score[v]) {
                    g_score[v] = tentative_g;
                    double f = tentative_g + heuristic(v, end);
                    parent[v] = u;
                    pq.push({f, v});
                }
            }
        }

        std::vector<int> path;
        if (g_score.find(end) == g_score.end()) return path;

        int curr = end;
        while (curr != start) {
            path.push_back(curr);
            curr = parent[curr];
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());
        return path;
    }
};

struct Regex {
    std::regex re;
    std::string pattern;

    Regex(std::string p) : pattern(p) {
        try {
            re = std::regex(p);
        } catch (const std::regex_error& e) {
            std::cerr << "Regex error: " << e.what() << std::endl;
        }
    }

    bool match(std::string s) {
        return std::regex_search(s, re);
    }

    std::string replace(std::string s, std::string replacement) {
        return std::regex_replace(s, re, replacement);
    }
};

// ---------------------------
`;
    }
}
