

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

        // Qt Includes (must come before DOM implementation)
        if (this.options.qt) {
            cppCode += "#include <QApplication>\n#include <QWidget>\n#include <QPushButton>\n#include <QLabel>\n#include <QLineEdit>\n#include <QVBoxLayout>\n#include <QHBoxLayout>\n#include <QListWidget>\n#include <QMessageBox>\n";
        }

        // OpenSSL Headers for JWT
        cppCode += "#include <openssl/hmac.h>\n#include <openssl/evp.h>\n#include <openssl/sha.h>\n#include <openssl/buffer.h>\n#include <openssl/bio.h>\n";

        // SQLite3 for database
        cppCode += "#include <sqlite3.h>\n\n";

        // SQLite Database Helper
        cppCode += `
// --- SQLite Database Helper ---
class RiriDB {
private:
    sqlite3* db;
    std::string dbPath;
    
public:
    RiriDB(std::string path = "riri.db") : dbPath(path), db(nullptr) {
        int rc = sqlite3_open(path.c_str(), &db);
        if (rc) {
            std::cerr << "Cannot open database: " << sqlite3_errmsg(db) << std::endl;
            db = nullptr;
        }
    }
    
    ~RiriDB() {
        if (db) sqlite3_close(db);
    }
    
    bool execute(std::string sql) {
        if (!db) return false;
        char* errMsg = nullptr;
        int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg);
        if (rc != SQLITE_OK) {
            std::cerr << "SQL Error: " << errMsg << std::endl;
            sqlite3_free(errMsg);
            return false;
        }
        return true;
    }
    
    std::vector<std::vector<std::string>> query(std::string sql) {
        std::vector<std::vector<std::string>> results;
        if (!db) return results;
        
        sqlite3_stmt* stmt;
        int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
        if (rc != SQLITE_OK) {
            std::cerr << "SQL Prepare Error: " << sqlite3_errmsg(db) << std::endl;
            return results;
        }
        
        int cols = sqlite3_column_count(stmt);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            std::vector<std::string> row;
            for (int i = 0; i < cols; i++) {
                const char* val = (const char*)sqlite3_column_text(stmt, i);
                row.push_back(val ? val : "");
            }
            results.push_back(row);
        }
        
        sqlite3_finalize(stmt);
        return results;
    }
    
    int lastInsertId() {
        if (!db) return 0;
        return (int)sqlite3_last_insert_rowid(db);
    }
};

// Global database instance
RiriDB* _riri_db = nullptr;

void _riri_db_init(std::string path = "riri.db") {
    if (_riri_db) delete _riri_db;
    _riri_db = new RiriDB(path);
}

bool _riri_db_exec(std::string sql) {
    if (!_riri_db) _riri_db_init();
    return _riri_db->execute(sql);
}

std::vector<std::vector<std::string>> _riri_db_query(std::string sql) {
    if (!_riri_db) _riri_db_init();
    return _riri_db->query(sql);
}

int _riri_db_last_id() {
    if (!_riri_db) return 0;
    return _riri_db->lastInsertId();
}

std::string _riri_escape_sql(std::string s) {
    std::string result;
    for (char c : s) {
        if (c == 39) result += "''";  // 39 is ASCII for single quote
        else result += c;
    }
    return result;
}
`;

        cppCode += `
// --- Base64Url Implementation ---
std::string base64url_encode(const std::string &in) {
    if (in.empty()) return "";
    BIO *bio, *b64;
    BUF_MEM *bufferPtr;

    b64 = BIO_new(BIO_f_base64());
    bio = BIO_new(BIO_s_mem());
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    bio = BIO_push(b64, bio);

    BIO_write(bio, in.c_str(), in.length());
    BIO_flush(bio);
    BIO_get_mem_ptr(bio, &bufferPtr);
    
    std::string out(bufferPtr->data, bufferPtr->length);
    BIO_free_all(bio);

    // Convert to URL safe
    std::replace(out.begin(), out.end(), '+', '-');
    std::replace(out.begin(), out.end(), '/', '_');
    out.erase(std::remove(out.begin(), out.end(), '='), out.end());
    
    return out;
}

std::string base64url_decode(const std::string &in) {
    if (in.empty()) return "";
    std::string temp = in;
    std::replace(temp.begin(), temp.end(), '-', '+');
    std::replace(temp.begin(), temp.end(), '_', '/');
    while (temp.length() % 4 != 0) temp += '=';

    BIO *bio, *b64;
    char *buffer = (char *)malloc(temp.length());
    memset(buffer, 0, temp.length());

    b64 = BIO_new(BIO_f_base64());
    bio = BIO_new_mem_buf(temp.c_str(), temp.length());
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    bio = BIO_push(b64, bio);

    int len = BIO_read(bio, buffer, temp.length());
    std::string out(buffer, len);
    
    BIO_free_all(bio);
    free(buffer);
    
    return out;
}

// --- HMAC-SHA256 ---
std::string hmac_sha256(const std::string &key, const std::string &data) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int len = 0;
    
    HMAC(EVP_sha256(), key.c_str(), key.length(), (unsigned char*)data.c_str(), data.length(), hash, &len);
    
    return std::string((char*)hash, len);
}

// --- JWT Helper ---
// Expose as global functions mapped to JWT.sign / verify
struct JWT {
    static std::string sign(std::string payload, std::string secret) {
        std::string header = "{\\"alg\\":\\"HS256\\",\\"typ\\":\\"JWT\\"}";
        std::string encodedHeader = base64url_encode(header);
        std::string encodedPayload = base64url_encode(payload);
        
        std::string signature = hmac_sha256(secret, encodedHeader + "." + encodedPayload);
        std::string encodedSignature = base64url_encode(signature);
        
        return encodedHeader + "." + encodedPayload + "." + encodedSignature;
    }

    static std::string verify(std::string token, std::string secret) {
        std::vector<std::string> parts;
        std::stringstream ss(token);
        std::string segment;
        while(std::getline(ss, segment, '.')) {
            parts.push_back(segment);
            if (parts.size() > 3) break; // Invalid format
        }

        if (parts.size() != 3) return "error: invalid token format";

        std::string header = parts[0];
        std::string payload = parts[1];
        std::string signature = parts[2];

        std::string expectedSig = base64url_encode(hmac_sha256(secret, header + "." + payload));
        
        if (signature != expectedSig) return "error: signature mismatch";

        return base64url_decode(payload);
    }
};

// --- JSON Helper (Simple Regex/Find based) ---
// Extracts string value for a key. Returns empty string if not found.
std::string _riri_get_json_string(std::string json, std::string key) {
    char dq = 34; std::string key_pattern = std::string(1, dq) + key + std::string(1, dq);
    size_t pos = json.find(key_pattern);
    if (pos == std::string::npos) return "";
    
    pos += key_pattern.length();
    
    // Find colon
    pos = json.find(":", pos);
    if (pos == std::string::npos) return "";
    pos++; // skip colon

    // Skip whitespace
    while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\\n' || json[pos] == '\\r' || json[pos] == '\\t')) pos++;
    
    if (pos >= json.length()) return "";

    // If string
    if (json[pos] == '"') {
        pos++; // skip opening quote
        size_t end = pos;
        while (end < json.length()) {
             if (json[end] == '"' && json[end-1] != '\\\\') break;
             end++;
        }
        if (end >= json.length()) return "";
        return json.substr(pos, end - pos);
    }
    
    // If number/boolean (simple read until comma or })
    size_t end = json.find_first_of(",}", pos);
    if (end == std::string::npos) return "";
    return json.substr(pos, end - pos);
}

std::vector<std::string> _riri_get_json_array(std::string json, std::string key) {
    // 1. Get the array string
    // Reuse basic logic or copy-paste part of it
    // Or just parsing the value manually
    char dq = 34; std::string key_pattern = std::string(1, dq) + key + std::string(1, dq);
    size_t pos = json.find(key_pattern);
    if (pos == std::string::npos) return {};
    pos = json.find(":", pos + key_pattern.length());
    if (pos == std::string::npos) return {};
    pos = json.find("[", pos); // Find start of array
    if (pos == std::string::npos) return {};
    pos++; // skip [

    std::vector<std::string> result;
    while (pos < json.length()) {
        // Skip whitespace
        while (pos < json.length() && isspace(json[pos])) pos++;
        if (pos >= json.length()) break;
        if (json[pos] == ']') break; // End of array

        if (json[pos] == '"') {
            // String item
            pos++;
            size_t end = pos;
            while (end < json.length()) {
                 if (json[end] == '"' && json[end-1] != '\\\\') break;
                 end++;
            }
            if (end >= json.length()) break;
            result.push_back(json.substr(pos, end - pos));
            pos = end + 1;
        }
        
        // Skip comma
        pos = json.find_first_of(",]", pos);
        if (pos == std::string::npos) break;
        if (json[pos] == ']') break;
        pos++;
    }
    return result;
}

struct JSON {
    static std::string get(std::string json, std::string key) {
        return _riri_get_json_string(json, key);
    }
    static std::vector<std::string> getArray(std::string json, std::string key) {
        return _riri_get_json_array(json, key);
    }
};
`;

        if (this.options.qt) {
            cppCode += `
void qt_connect(std::shared_ptr<QPushButton> btn, std::string signal, std::function<void()> callback) {
    if (signal == "clicked" && btn) {
        QObject::connect(btn.get(), &QPushButton::clicked, callback);
    }
}

// Qt Helpers
std::shared_ptr<QListWidget> _riri_create_list() {
    return std::make_shared<QListWidget>();
}

void _riri_list_add(std::shared_ptr<QListWidget> list, std::string item) {
    list->addItem(QString::fromStdString(item));
}

void _riri_list_clear(std::shared_ptr<QListWidget> list) {
    list->clear();
}

void _riri_msg_box(std::string msg) {
    QMessageBox msgBox;
    msgBox.setText(QString::fromStdString(msg));
    msgBox.exec();
}
`;
        }

        // HTTP Client Helpers using httplib
        cppCode += `
std::string _riri_fetch_get(std::string urlStr, std::string token = "") {
    // Basic parsing of url (assuming http://host:port/path)
    // For MVP assuming localhost:8080
    
    httplib::Client cli("http://localhost:8080");
    httplib::Headers headers;
    if (!token.empty()) {
        headers.emplace("Authorization", token);
    }
    
    // Extract path? 
    // urlStr: http://localhost:8080/api/todos -> /api/todos
    std::string path = urlStr;
    size_t pos = urlStr.find("8080");
    if (pos != std::string::npos) {
        path = urlStr.substr(pos + 4);
    }
    
    auto res = cli.Get(path, headers);
    if (res && res->status == 200) {
        return res->body;
    }
    return "";
}

std::string _riri_fetch_post(std::string urlStr, std::string body, std::string token = "") {
    httplib::Client cli("http://localhost:8080");
    httplib::Headers headers;
    if (!token.empty()) {
        headers.emplace("Authorization", token);
    }
    
    std::string path = urlStr;
    size_t pos = urlStr.find("8080");
    if (pos != std::string::npos) {
        path = urlStr.substr(pos + 4);
    }

    auto res = cli.Post(path, headers, body, "application/json");
    if (res) {
        return res->body;
    }
    return "error";
}
`;

        // Helper macros and includes for Qt DOM
        if (this.options.qt) {
            cppCode += `
QString qt_str(std::string s) { return QString::fromStdString(s); }
std::string qt_to_std(QString s) { return s.toStdString(); }

// --- DOM Implementation using raw pointers ---
// Qt has its own memory management via parent-child relationships

struct QtElement {
    QWidget* widget = nullptr;
    QLayout* layout = nullptr;
    std::string tagName;

    QtElement(std::string tag) : tagName(tag) {}
    ~QtElement() {
        // Don't delete widget - Qt manages via parent hierarchy
    }

    void setAttribute(std::string key, std::string value) {
        if (!widget) return;
        if (key == "text") {
            if (auto btn = qobject_cast<QPushButton*>(widget)) {
                btn->setText(QString::fromStdString(value));
            } else if (auto lbl = qobject_cast<QLabel*>(widget)) {
                lbl->setText(QString::fromStdString(value));
            } else if (auto inp = qobject_cast<QLineEdit*>(widget)) {
                inp->setText(QString::fromStdString(value));
            }
        }
        if (key == "title") {
            widget->setWindowTitle(QString::fromStdString(value));
        }
        if (key == "style") {
            widget->setStyleSheet(QString::fromStdString(value));
        }
        if (key == "placeholder") {
            if (auto inp = qobject_cast<QLineEdit*>(widget)) {
                inp->setPlaceholderText(QString::fromStdString(value));
            }
        }
    }

    std::string getValue() {
        if (!widget) return "";
        if (auto inp = qobject_cast<QLineEdit*>(widget)) {
            return inp->text().toStdString();
        }
        return "";
    }

    void addItem(std::string text) {
        if (!widget) return;
        if (auto lst = qobject_cast<QListWidget*>(widget)) {
            lst->addItem(QString::fromStdString(text));
        }
    }

    void clearItems() {
        if (!widget) return;
        if (auto lst = qobject_cast<QListWidget*>(widget)) {
            lst->clear();
        }
    }

    void addEventListener(std::string event, std::function<void()> callback) {
        if (!widget) return;
        if (event == "click") {
            if (auto btn = qobject_cast<QPushButton*>(widget)) {
                QObject::connect(btn, &QPushButton::clicked, callback);
            }
        }
    }

    void appendChild(QtElement* child) {
        if (!widget || !child || !child->widget) return;

        if (layout) {
            layout->addWidget(child->widget);
        } else {
            child->widget->setParent(widget);
            child->widget->show();
        }
    }

    void show() {
        if (widget) widget->show();
    }
};

struct Document {
    QtElement* createElement(std::string tag) {
        QtElement* el = new QtElement(tag);

        if (tag == "div") {
            el->widget = new QWidget();
            el->layout = new QVBoxLayout(el->widget);
        } else if (tag == "span") {
            el->widget = new QWidget();
            el->layout = new QHBoxLayout(el->widget);
        } else if (tag == "button") {
            el->widget = new QPushButton();
        } else if (tag == "label") {
            el->widget = new QLabel();
        } else if (tag == "input") {
            el->widget = new QLineEdit();
        } else if (tag == "list") {
            el->widget = new QListWidget();
        } else if (tag == "window") {
            el->widget = new QWidget();
            el->layout = new QVBoxLayout(el->widget);
            el->widget->resize(400, 300);
        }

        return el;
    }
};
`;
        }

        cppCode += "\n";

        // Helper for printing
        // Helper for printing
        cppCode += `
template <typename T>
void print_val(T t) {
    if constexpr(std::is_same_v<T, std::string> || std::is_same_v<T, const char*>) {
        std::cout << t;
    } else {
        std::cout << t;
    }
}
void print_val(const char* t) { std::cout << t; }
`;

        // Add built-in libraries
        cppCode += this.getBuiltinLibraries();

        const classes: string[] = [];
        const mainBody: string[] = [];

        // Forward declare functions so they can be called recursively or out of order?
        // No, lambdas can't recurse easily with 'auto'. We assume topological sort or forward declare with explicit std::function if needed.
        // For now, assume defined-before-use (script logic).

        for (const stmt of this.program.body) {
            if (stmt.kind === NodeType.ClassDeclaration) {
                classes.push(this.genClassDeclaration(stmt as ClassDeclaration));
            } else {
                // Everything else goes into main() sequentially
                mainBody.push(this.genStatement(stmt));
            }
        }

        // Add classes
        for (const cls of classes) {
            cppCode += cls;
        }

        // Add main function
        cppCode += "int main(int argc, char *argv[]) {\n";

        if (this.options.qt) {
            cppCode += "QApplication app(argc, argv);\n";
            // Initialize global document
            cppCode += "Document document;\n";
        } else {
            cppCode += "std::srand(std::time(0));\n";
        }

        for (const stmt of mainBody) {
            cppCode += stmt;
        }

        if (this.options.qt) {
            cppCode += "return app.exec();\n";
        } else {
            cppCode += "return 0;\n";
        }
        cppCode += "}\n";

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
                throw new Error(`Unknown statement kind: ${stmt.kind} `);
        }
    }

    private genVarDeclaration(stmt: VariableDeclaration): string {
        if (!stmt.value) {
            return `int ${stmt.identifier}; \n`;
        }

        return `auto ${stmt.identifier} = ${this.genExpression(stmt.value)}; \n`;
    }

    private genFuncDeclaration(stmt: FunctionDeclaration): string {
        // Use C++20 auto template parameters
        const params = stmt.params.map(p => `auto ${p} `).join(", ");

        let body = "{\n";
        for (const s of stmt.body) {
            body += this.genStatement(s);
        }
        body += "}";

        const funcName = stmt.name === "main" ? "riri_main" : stmt.name;
        // Generate as lambda to capture local scope defined before it
        return `auto ${funcName} =[&](${params}) ${body}; \n`;
    }

    private genReturnStatement(stmt: ReturnStatement): string {
        if (!stmt.value) return "return;\n";
        return `return ${this.genExpression(stmt.value)}; \n`;
    }

    private genIfStatement(stmt: IfStatement): string {
        let code = `if (${this.genExpression(stmt.condition)}) {
        \n`;
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
        let code = `while (${this.genExpression(stmt.condition)}) {
            \n`;
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
        let code = `struct ${stmt.name} {
                \n`;

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
                else if (val.kind === NodeType.NewExpression) type = `std:: shared_ptr < ${(val as NewExpression).className}> `;
                else if (val.kind === NodeType.Identifier) {
                    const s = (val as Identifier).symbol;
                    if (s === "true" || s === "false") type = "bool";
                }
                code += `    ${type} ${f.identifier} = ${this.genExpression(val)}; \n`;
            } else {
                code += `    int ${f.identifier}; \n`;
            }
        }

        // Methods
        for (const m of stmt.methods) {
            const params = m.params.map((p: any) => `auto ${p} `).join(", ");
            let body = "{\n";
            for (const s of m.body) {
                body += this.genStatement(s);
            }
            body += "}\n";
            code += `    auto ${m.name} (${params}) ${body} `;
        }

        code += "};\n";
        return code;
    }

    private genExprStatement(stmt: ExpressionStatement): string {
        return `${this.genExpression(stmt.expression)}; \n`;
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
                if (symbol === "null") return "nullptr";
                // JWT is a struct in C++, so passing "JWT" works fine as class name for static methods
                return symbol === "main" ? "riri_main" : symbol;
            case NodeType.NumericLiteral:
                return (expr as NumericLiteral).value.toString();
            case NodeType.StringLiteral:
                return `std:: string("${(expr as StringLiteral).value}")`;
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
                throw new Error(`Unknown expression kind: ${expr.kind} `);
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
                return `auto ${p} `;
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
            body += `return ${this.genExpression(expr.body)}; \n`;
        }

        // If original params included 'next', this is middleware - return Unhandled
        if (expr.params.includes("next")) {
            body += "return httplib::Server::HandlerResponse::Unhandled;\n";
        }

        body += "}";

        return `[&](${params}) ${body} `;
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

        return `${objExp} [${indexExp}]`;
    }

    private genAssignmentExpr(expr: AssignmentExpression): string {
        const left = this.genExpression(expr.assignee);
        const right = this.genExpression(expr.value);
        return `${left} = ${right} `;
    }

    private genBinaryExpr(expr: BinaryExpression): string {
        return `${this.genExpression(expr.left)} ${expr.operator} ${this.genExpression(expr.right)} `;
    }

    private genArrayLiteral(expr: ArrayLiteral): string {
        const elements = expr.elements.map(e => this.genExpression(e)).join(", ");

        if (expr.elements.length === 0) {
            return "std::vector<int>{}";
        }
        return `std::vector{${elements} } `;
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
                        mathFunc = `std::${member.property} `;
                    }
                }
            }
        }

        if (isMathCall) {
            if (mathFunc.includes("rand")) {
                return mathFunc;
            }
            const args = expr.args.map(a => this.genExpression(a)).join(", ");
            return `${mathFunc} (${args})`;
        }

        const callee = this.genExpression(expr.callee);

        if (callee === "print") {
            const printArgs = expr.args.map(a => this.genExpression(a)).join(" << \" \" << ");
            return `std:: cout << ${printArgs} << std:: endl`;
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
                    return `_riri_tprint(${args}); \n`;
                }
            }
        }

        if (callee === "tprint") {
            // tprint(arr)
            const args = expr.args.map(a => this.genExpression(a)).join(", ");
            return `_riri_tprint(${args}); \n`;
        }

        if (callee === "createList") {
            return `_riri_create_list()`;
        }
        if (callee === "msgBox") {
            const arg = this.genExpression(expr.args[0]);
            return `_riri_msg_box(${arg})`;
        }
        if (callee === "fetch") {
            const url = this.genExpression(expr.args[0]);
            const token = expr.args[1] ? this.genExpression(expr.args[1]) : `""`;
            return `_riri_fetch_get(${url}, ${token})`;
        }
        if (callee === "post") {
            const url = this.genExpression(expr.args[0]);
            const body = this.genExpression(expr.args[1]);
            const token = expr.args[2] ? this.genExpression(expr.args[2]) : `""`;
            return `_riri_fetch_post(${url}, ${body}, ${token})`;
        }

        // Database functions
        if (callee === "dbInit") {
            const path = expr.args[0] ? this.genExpression(expr.args[0]) : `"riri.db"`;
            return `_riri_db_init(${path})`;
        }
        if (callee === "dbExec") {
            const sql = this.genExpression(expr.args[0]);
            return `_riri_db_exec(${sql})`;
        }
        if (callee === "dbQuery") {
            const sql = this.genExpression(expr.args[0]);
            return `_riri_db_query(${sql})`;
        }
        if (callee === "dbLastId") {
            return `_riri_db_last_id()`;
        }
        if (callee === "escapeSql") {
            const str = this.genExpression(expr.args[0]);
            return `_riri_escape_sql(${str})`;
        }

        if (callee === "sort") {
            const arg = this.genExpression(expr.args[0]);
            return `std:: sort(${arg}.begin(), ${arg}.end())`;
        } else if (callee === "string") {
            const arg = this.genExpression(expr.args[0]);
            return `std:: to_string(${arg})`;
        } else if (callee === "int") {
            const arg = this.genExpression(expr.args[0]);
            return `std::stoi(${arg})`;
        } else if (callee === "float") {
            const arg = this.genExpression(expr.args[0]);
            return `std:: stod(${arg})`;
        } else if (callee === "rand") {
            return `std:: rand()`;
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

            // Qt List Methods
            if (method === "add") {
                // Check if list? We assume yes for now given limited riri standard lib
                const obj = this.genExpression(member.object);
                const item = this.genExpression(expr.args[0 as any]); // Fix TS error args index
                return `_riri_list_add(${obj}, ${item})`;
            }
            if (method === "clear") {
                const obj = this.genExpression(member.object);
                return `_riri_list_clear(${obj})`;
            }

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

            // Static JSON calls
            if (member.object.kind === NodeType.Identifier && (member.object as Identifier).symbol === "JSON") {
                if (method === "get") {
                    const arg0 = this.genExpression(expr.args[0]);
                    const arg1 = this.genExpression(expr.args[1]);
                    return `JSON:: get(${arg0}, ${arg1})`;
                }
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
                return `${this.genExpression(member.object)} -> listen("0.0.0.0", ${port})`;
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
                    return `${this.genExpression(member.object)} -> ${httpMethod} (${path}, ${callback})`;
                }
            }

            if (method === "use") {
                // app.use((req, res, next) => { ... })
                // httplib set_pre_routing_handler
                const callback = this.genExpression(expr.args[0]);
                return `${this.genExpression(member.object)} -> set_pre_routing_handler(${callback})`;
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
                return `${this.genExpression(member.object)}.status = ${code} `;
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
            if (member.property === "get_param_value") {
                const obj = this.genExpression(member.object);
                const arg = this.genExpression(expr.args[0]);
                return `${obj}.get_param_value(${arg})`;
            }
            if (member.property === "get_header_value") {
                const obj = this.genExpression(member.object);
                const arg = this.genExpression(expr.args[0]);
                return `${obj}.get_header_value(${arg})`;
            }
            if (member.property === "startsWith") {
                // For strings: str.startsWith(prefix) -> str.rfind(prefix, 0) == 0
                // Or create helper _riri_startsWith(str, prefix)
                const obj = this.genExpression(member.object);
                const arg = this.genExpression(expr.args[0]);
                return `_riri_startsWith(${obj}, ${arg})`;
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
                    return `${objExp}.${member.property} (${args})`;
                }
            }
        }

        const args = expr.args.map(a => this.genExpression(a)).join(", ");
        return `${callee} (${args})`;
    }

    private genSwitchStatement(stmt: SwitchStatement): string {
        let code = `switch (${this.genExpression(stmt.discriminant)
            }) {
            \n`;
        for (const c of stmt.cases) {
            code += `case ${this.genExpression(c.test)}: {
                \n`;
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
            return `std:: make_shared < httplib:: Server > ()`;
        }

        // Use std::make_shared for ARC
        return `std:: make_shared < ${expr.className}> (${args})`;
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
            // Let's use `catch (...)` or `catch (const std:: exception& e)` if we use exceptions.
            // Riri currently doesn't throw.
            // But system might (e.g. vector out of range? though [] is usually unchecked or segfault).
            // Let's support `catch (...)` for now.

            // If user provided param "e", we need to define it?
            // We can assume it's a string message?
            // Hack: `catch (const std:: exception& e)` and define variable `e`?

            if (stmt.catchParam) {
                // Generate: catch (const std::exception& e) { std::string e_msg = e.what(); ... }
                // We map the user identifier to a local string variable containing .what()
                // Because users might want to print(e).
                code += `catch (const std:: exception& _e) {
                    \n`;
                code += `std::string ${stmt.catchParam} = _e.what(); \n`;
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

            // Let's assume `push` on a bare identifier that isn't `new `ed is a vector?
            // `let arr = [...]` -> value.
            // `let h = new Heap()` -> pointer.

            // Refined heuristic:
            // If we use `.` it must be a value.
            // If we use `-> ` it must be a pointer.

            // If the property is `push` or `pop`:
            // 1. If it's a vector, we want `.push_back`.
            // 2. If it's a heap (ptr), we want `-> push`.

            // Can we compile `t.push` (dot) on a pointer? No. 
            // Can we compile `t -> push_back` on a vector? No.

            // Let's blindly try to support Riri `push` for both.
            // But we need to distinguish.
            // What if we rename Heap methods to `insert` / `remove` to avoid collision? 
            // Or what if we make Heap a value type?

            // Structs are allocated with `new ` -> returns pointer.
            // Vectors are `std:: vector` -> value.

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
            // It currently transforms to `obj.push(x)` or `obj -> push(x)`.

            // If we change `genMemberExpr` to returns a string...
            // If we use the helper `riri_push`, we need to change `genCallExpr`, not `genMemberExpr` (mostly).

            // Let's modify `genCallExpr` to intercept `push` and `pop`.

            return `(${this.genExpression(expr.object)}) -> ${expr.property} `;
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

            return `${this.genExpression(expr.object)}.${expr.property} `;
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
                // It returns `object -> method`.
                // We need to change genCallExpr logic.
            }
        }

        // Detect static access for JWT
        if (expr.object.kind === NodeType.Identifier) {
            const symbol = (expr.object as Identifier).symbol;
            if (symbol === "JWT") {
                return `JWT::${expr.property} `;
            }
            if (symbol === "JSON") {
                return `JSON::${expr.property} `;
            }
        }

        // Special case for 'req.body' (httplib uses .body)
        if (expr.object.kind === NodeType.Identifier && (expr.object as Identifier).symbol === "req" && expr.property === "body") {
            return `req.body`;
        }

        // Special case for 'document' (Qt DOM implementation - value type)
        if (expr.object.kind === NodeType.Identifier && (expr.object as Identifier).symbol === "document") {
            return `document.${expr.property}`;
        }

        // Default pointer access
        return `(${this.genExpression(expr.object)}) -> ${expr.property} `;
    }

    // NOTE: genCallExpr handles the method invocation syntax `-> ` vs `.`
    // We need to update genCallExpr logic separately.

    private getBuiltinLibraries(): string {
        return `
                        // --- Built-in Helpers ---

                        // Async/Await support
                        #include <thread>
                        #include <chrono>
                        #include <future>

                        template < typename Func >
                            auto async_task(Func && func) {
                            return std:: async (std:: launch:: async, std:: forward<Func> (func));
                        }

                        void delay(int milliseconds) {
                            std:: this_thread:: sleep_for(std:: chrono:: milliseconds(milliseconds));
                        }

                        template < typename T >
                            T await_result(std:: future<T> & future) {
                            return future.get();
                        }

                        // Helper to get from multimap (query)
                        std::string _riri_get_query(const std:: multimap<std:: string, std:: string >& m, std::string key) {
    auto it = m.find(key);
                            if (it != m.end()) return it -> second;
                            return "";
                        }

                        // Helper to get from map (path params)
                        std::string _riri_get_param(const std:: unordered_map<std:: string, std:: string >& m, std::string key) {
                            if (m.count(key)) return m.at(key);
                            return "";
                        }

                        std::string _riri_input() {
                            std::string s;
                            std:: getline(std:: cin, s);
                            return s;
                        }

                        // Overloads for push/pop to handle both std::vector (value) and Heap* (pointer)

                        // Vector push
                        template < typename T, typename U >
                            void _riri_push(std:: vector<T> & vec, U val) {
                            vec.push_back(val);
                        }

                        // Heap/Object pointer push (raw)
                        template < typename T >
                            void _riri_push(T * obj, int val) {
                            obj -> push(val);
                        }

                        // Heap/Object shared_ptr push
                        template < typename T >
                            void _riri_push(std:: shared_ptr < T > obj, int val) {
                            obj -> push(val);
                        }

                        // Vector pop
                        template < typename T >
                            T _riri_pop(std:: vector<T> & vec) {
                            if (vec.empty()) return T(); // Return default
    T val = vec.back();
                            vec.pop_back();
                            return val;
                        }

                        // Heap/Object pointer pop (raw)
                        template < typename T >
                            int _riri_pop(T * obj) {
                            return obj -> pop();
                        }

                        // Heap/Object shared_ptr pop
                        template < typename T >
                            int _riri_pop(std:: shared_ptr < T > obj) {
                            return obj -> pop();
                        }

                        std::string _riri_fetch(std:: string url) {
                            std::string cmd = "curl -s " + url;
                            std::string result;
    char buffer[128];
                            FILE * pipe = popen(cmd.c_str(), "r");
                            if (!pipe) return "ERROR";
                            while (!feof(pipe)) {
                                if (fgets(buffer, 128, pipe) != NULL)
                                    result += buffer;
                            }
                            pclose(pipe);
                            return result;
                        }

                        // JavaScript-like array methods
                        template < typename T, typename Func >
                            std:: vector < T > _riri_map(const std:: vector<T>& vec, Func callback) {
                            std:: vector < T > result;
                            for (size_t i = 0; i < vec.size(); i++) {
                                result.push_back(callback(vec[i]));
                            }
                            return result;
                        }

                        template < typename T, typename Func >
                            std:: vector < T > _riri_filter(const std:: vector<T>& vec, Func callback) {
                            std:: vector < T > result;
                            for (size_t i = 0; i < vec.size(); i++) {
                                if (callback(vec[i])) {
                                    result.push_back(vec[i]);
                                }
                            }
                            return result;
                        }

                        template < typename T >
                            std:: vector < T > _riri_slice(const std:: vector<T>& vec, int start, int end = -1) {
                            if (end == -1) end = vec.size();
                            if (start < 0) start = vec.size() + start;
                            if (end < 0) end = vec.size() + end;
                            if (start < 0) start = 0;
                            if (end > (int)vec.size()) end = vec.size();
                            if (start >= end) return std:: vector<T>();
                            return std:: vector<T>(vec.begin() + start, vec.begin() + end);
                        }

                        template < typename T, typename Func >
                            void _riri_forEach(const std:: vector<T>& vec, Func callback) {
                            for (size_t i = 0; i < vec.size(); i++) {
                                callback(vec[i], i);
                            }
                        }

                        template < typename T, typename Func >
                            T _riri_reduce(const std:: vector<T>& vec, Func callback, T initial) {
    T result = initial;
                            for (size_t i = 0; i < vec.size(); i++) {
                                result = callback(result, vec[i], i);
                            }
                            return result;
                        }

                        template < typename T >
                            int _riri_indexOf(const std:: vector<T>& vec, T value) {
                            for (size_t i = 0; i < vec.size(); i++) {
                                if (vec[i] == value) return i;
                            }
                            return -1;
                        }

                        template < typename T >
                            bool _riri_includes(const std:: vector<T>& vec, T value) {
                            return _riri_indexOf(vec, value) != -1;
                        }

                        template < typename T >
                            std:: vector < T > _riri_concat(const std:: vector<T>& vec1, const std:: vector<T>& vec2) {
                            std:: vector < T > result = vec1;
                            result.insert(result.end(), vec2.begin(), vec2.end());
                            return result;
                        }

                        template < typename T >
                            std:: vector < T > _riri_reverse(std:: vector < T > vec) {
                            std:: reverse(vec.begin(), vec.end());
                            return vec;
                        }

                        template < typename T >
                            std::string _riri_join(const std:: vector<T>& vec, std::string separator = ",") {
                            if (vec.empty()) return "";
                            std::ostringstream oss;
                            oss << vec[0];
                            for (size_t i = 1; i < vec.size(); i++) {
                                oss << separator << vec[i];
                            }
                            return oss.str();
                        }

                        // String methods
                        std:: vector < std:: string > _riri_split(std:: string str, std:: string delimiter) {
                            std:: vector < std:: string > result;
    size_t pos = 0;
                            while ((pos = str.find(delimiter)) != std:: string::npos) {
                                result.push_back(str.substr(0, pos));
                                str.erase(0, pos + delimiter.length());
                            }
                            result.push_back(str);
                            return result;
                        }

                        std::string _riri_toLowerCase(std:: string str) {
                            std:: transform(str.begin(), str.end(), str.begin(), :: tolower);
                            return str;
                        }

                        std::string _riri_toUpperCase(std:: string str) {
                            std:: transform(str.begin(), str.end(), str.begin(), :: toupper);
                            return str;
                        }

                        std::string _riri_trim(std:: string str) {
                            str.erase(0, str.find_first_not_of(" \\t\\n\\r"));
                            str.erase(str.find_last_not_of(" \\t\\n\\r") + 1);
                            return str;
                        }

bool _riri_startsWith(std:: string str, std:: string prefix) {
                            return str.rfind(prefix, 0) == 0;
                        }

int _riri_parseInt(std:: string str) {
                            return std:: stoi(str);
                        }

double _riri_parseFloat(std:: string str) {
                            return std:: stod(str);
                        }

                        template < typename T >
                            void _riri_tprint(const std:: vector<T>& vec) {
                            std:: cout << "+----------------+" << std:: endl;
                            std:: cout << "| Index | Value  |" << std:: endl;
                            std:: cout << "+----------------+" << std:: endl;
                            for (size_t i = 0; i < vec.size(); ++i) {
                                std:: cout << "| " << i << "\\t| " << vec[i] << "\\t|" << std:: endl;
                            }
                            std:: cout << "+----------------+" << std:: endl;
                        }

// --- Built-in Tree Library ---

struct Node {
    int data;
                            std:: shared_ptr < Node > left = nullptr;
                            std:: shared_ptr < Node > right = nullptr;
    int height = 1; // For AVL

                            Node(int val) : data(val) { }
                        };

struct BinaryTree {
                            std:: shared_ptr < Node > root = nullptr;

                            void insert(int val) {
                                if (!root) {
                                    root = std:: make_shared<Node>(val);
                                    return;
                                }
                                insertRec(root, val);
                            }

                            void insertRec(std:: shared_ptr < Node > node, int val) {
                                if (val < node -> data) {
                                    if (node -> left) insertRec(node -> left, val);
                                    else node -> left = std:: make_shared<Node>(val);
                                } else {
                                    if (node -> right) insertRec(node -> right, val);
                                    else node -> right = std:: make_shared<Node>(val);
                                }
                            }

                            void printInOrder() {
                                printInOrderRec(root);
                                std:: cout << std:: endl;
                            }

                            void printInOrderRec(std:: shared_ptr < Node > node) {
                                if (!node) return;
                                printInOrderRec(node -> left);
                                std:: cout << node -> data << " ";
                                printInOrderRec(node -> right);
                            }
                        };

struct BST: public BinaryTree {
    // Inherits insert and print from BinaryTree (which is basically a BST logic above)
    bool search(int val) {
                                return searchRec(root, val);
                            }

    bool searchRec(std:: shared_ptr < Node > node, int val) {
                                if (!node) return false;
                                if (node -> data == val) return true;
                                if (val < node -> data) return searchRec(node -> left, val);
                                return searchRec(node -> right, val);
                            }
                        };

struct AVL {
                            std:: shared_ptr < Node > root = nullptr;

    int height(std:: shared_ptr < Node > N) {
                                if (N == nullptr) return 0;
                                return N -> height;
                            }

    int max(int a, int b) {
                                return (a > b) ? a : b;
                            }

                            std:: shared_ptr < Node > rightRotate(std:: shared_ptr < Node > y) {
                                std:: shared_ptr < Node > x = y -> left;
                                std:: shared_ptr < Node > T2 = x -> right;
                                x -> right = y;
                                y -> left = T2;
                                y -> height = max(height(y -> left), height(y -> right)) + 1;
                                x -> height = max(height(x -> left), height(x -> right)) + 1;
                                return x;
                            }

                            std:: shared_ptr < Node > leftRotate(std:: shared_ptr < Node > x) {
                                std:: shared_ptr < Node > y = x -> right;
                                std:: shared_ptr < Node > T2 = y -> left;
                                y -> left = x;
                                x -> right = T2;
                                x -> height = max(height(x -> left), height(x -> right)) + 1;
                                y -> height = max(height(y -> left), height(y -> right)) + 1;
                                return y;
                            }

    int getBalance(std:: shared_ptr < Node > N) {
                                if (N == nullptr) return 0;
                                return height(N -> left) - height(N -> right);
                            }

                            std:: shared_ptr < Node > insertRec(std:: shared_ptr < Node > node, int data) {
                                if (node == nullptr) return std:: make_shared<Node>(data);
                                if (data < node -> data) node -> left = insertRec(node -> left, data);
        else if (data > node -> data) node -> right = insertRec(node -> right, data);
        else return node; // Equal keys not allowed

                                node -> height = 1 + max(height(node -> left), height(node -> right));
        int balance = getBalance(node);

                                // Left Left
                                if (balance > 1 && data < node -> left -> data) return rightRotate(node);
                                // Right Right
                                if (balance < -1 && data > node -> right -> data) return leftRotate(node);
                                // Left Right
                                if (balance > 1 && data > node -> left -> data) {
                                    node -> left = leftRotate(node -> left);
                                    return rightRotate(node);
                                }
                                // Right Left
                                if (balance < -1 && data < node -> right -> data) {
                                    node -> right = rightRotate(node -> right);
                                    return leftRotate(node);
                                }
                                return node;
                            }

                            void insert(int val) {
                                root = insertRec(root, val);
                            }

                            void printInOrder() {
                                printInOrderRec(root);
                                std:: cout << std:: endl;
                            }

                            void printInOrderRec(std:: shared_ptr < Node > node) {
                                if (!node) return;
                                printInOrderRec(node -> left);
                                std:: cout << node -> data << " ";
                                printInOrderRec(node -> right);
                            }
                        };

struct Heap {
                            std:: vector < int > data;

                            void push(int val) {
                                data.push_back(val);
                                std:: push_heap(data.begin(), data.end()); // Max heap by default
                            }

    int pop() {
                                if (data.empty()) return -1; // Error
                                std:: pop_heap(data.begin(), data.end());
        int val = data.back();
                                data.pop_back();
                                return val;
                            }

    int top() {
                                if (data.empty()) return -1;
                                return data.front();
                            }

                            void print() {
                                for (int i : data) std:: cout << i << " ";
                                std:: cout << std:: endl;
                            }
                        };

struct Graph {
                            std:: map < int, std:: vector < std:: pair < int, int >>> adj; // u -> [(v, w)]
                            std:: map < int, std:: pair < int, int >> coords; // u -> (x, y)

                            void add_edge(int u, int v, int w) {
                                adj[u].push_back({ v, w });
                            }

                            void set_pos(int u, int x, int y) {
                                coords[u] = { x, y };
                            }

                            std:: vector < int > bfs(int start) {
                                std:: vector < int > path;
                                std:: queue < int > q;
                                std:: set < int > visited;

                                q.push(start);
                                visited.insert(start);

                                while (!q.empty()) {
            int u = q.front();
                                    q.pop();
                                    path.push_back(u);

                                    for (auto & edge : adj[u]) {
                int v = edge.first;
                                        if (visited.find(v) == visited.end()) {
                                            visited.insert(v);
                                            q.push(v);
                                        }
                                    }
                                }
                                return path;
                            }

                            std:: vector < int > dfs(int start) {
                                std:: vector < int > path;
                                std:: stack < int > s;
                                std:: set < int > visited;

                                s.push(start);

                                while (!s.empty()) {
            int u = s.top();
                                    s.pop();

                                    if (visited.find(u) == visited.end()) {
                                        visited.insert(u);
                                        path.push_back(u);

                                        auto & neighbors = adj[u];
                                        for (auto it = neighbors.rbegin(); it != neighbors.rend(); ++it) {
                    int v = it -> first;
                                            if (visited.find(v) == visited.end()) {
                                                s.push(v);
                                            }
                                        }
                                    }
                                }
                                return path;
                            }

                            std:: vector < int > dijkstra(int start, int end) {
                                std:: priority_queue < std:: pair<int, int>, std:: vector < std:: pair < int, int >>, std:: greater < std:: pair < int, int >>> pq;
                                std:: map < int, int > dist;
                                std:: map < int, int > parent;

                                dist[start] = 0;
                                pq.push({ 0, start });

                                while (!pq.empty()) {
            int d = pq.top().first;
            int u = pq.top().second;
                                    pq.pop();

                                    if (dist.find(u) != dist.end() && d > dist[u]) continue;
                                    if (u == end) break;

                                    for (auto & edge : adj[u]) {
                int v = edge.first;
                int weight = edge.second;

                bool is_inf = dist.find(v) == dist.end();
                                        if (is_inf || dist[u] + weight < dist[v]) {
                                            dist[v] = dist[u] + weight;
                                            parent[v] = u;
                                            pq.push({ dist[v], v });
                                        }
                                    }
                                }

                                std:: vector < int > path;
                                if (dist.find(end) == dist.end()) return path;

        int curr = end;
                                while (curr != start) {
                                    path.push_back(curr);
                                    curr = parent[curr];
                                }
                                path.push_back(start);
                                std:: reverse(path.begin(), path.end());
                                return path;
                            }

    double heuristic(int u, int v) {
                                if (coords.find(u) == coords.end() || coords.find(v) == coords.end()) return 0;
        int dx = coords[u].first - coords[v].first;
        int dy = coords[u].second - coords[v].second;
                                return std:: sqrt(dx * dx + dy * dy);
                            }

                            std:: vector < int > astar(int start, int end) {
                                std:: priority_queue < std:: pair<double, int>, std:: vector < std:: pair < double, int >>, std:: greater < std:: pair < double, int >>> pq;
                                std:: map < int, int > g_score;
                                std:: map < int, int > parent;

                                g_score[start] = 0;
                                pq.push({ 0 + heuristic(start, end), start });

                                while (!pq.empty()) {
            int u = pq.top().second;
                                    pq.pop();

                                    if (u == end) break;

                                    for (auto & edge : adj[u]) {
                int v = edge.first;
                int weight = edge.second;

                int tentative_g = g_score[u] + weight;
                bool is_inf = g_score.find(v) == g_score.end();

                                        if (is_inf || tentative_g < g_score[v]) {
                                            g_score[v] = tentative_g;
                    double f = tentative_g + heuristic(v, end);
                                            parent[v] = u;
                                            pq.push({ f, v });
                                        }
                                    }
                                }

                                std:: vector < int > path;
                                if (g_score.find(end) == g_score.end()) return path;

        int curr = end;
                                while (curr != start) {
                                    path.push_back(curr);
                                    curr = parent[curr];
                                }
                                path.push_back(start);
                                std:: reverse(path.begin(), path.end());
                                return path;
                            }
                        };

struct Regex {
                            std::regex re;
                            std::string pattern;

                            Regex(std:: string p) : pattern(p) {
                                try {
                                    re = std:: regex(p);
                                } catch (const std:: regex_error& e) {
                                    std:: cerr << "Regex error: " << e.what() << std:: endl;
                                }
                            }

    bool match(std:: string s) {
                                return std:: regex_search(s, re);
                            }

                            std::string replace(std:: string s, std:: string replacement) {
                                return std:: regex_replace(s, re, replacement);
                            }
                        };

                        // ---------------------------
                        `;
    }


}
