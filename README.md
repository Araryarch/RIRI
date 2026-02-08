# RiriLang 🚀

A modern, JavaScript-like programming language that transpiles to high-performance C++20.

## ✨ Features

- **Familiar Syntax**: JavaScript-inspired syntax (`let`, `func`, `console.log`).
- **High Performance**: Transpiles directly to native C++ binaries.
- **Built-in Data Structures**: First-class support for **BST**, **AVL Trees**, and **Heaps**.
- **OOP Support**: Classes, methods, and fields.
- **Modern Tooling**: Robust CLI for running and building projects.

## 🛠️ Prerequisites

- **Bun** (v1.0+)
- **G++** with C++20 support (`sudo apt install g++`)

## 📦 Installation

You can install RiriLang globally using the provided script:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/riri-lang.git
cd riri-lang

# 2. Run the install script (uses Bun)
./install.sh
```

> **Note:** Make sure `~/.bun/bin` is in your environment PATH to use the `rrc` command globally.
> For **Fish shell**, add it via: `set -Ux fish_user_paths $HOME/.bun/bin $fish_user_paths`

Everything is set! You can now use the `rrc` command from anywhere.

## 🚀 Usage

### Run a Script (Interpreter Mode)
Compiles and runs the file in memory immediately.
```bash
rrc run examples/hello.rr
```

### Build an Executable
Compiles the file to a native binary in the same directory.
```bash
rrc build examples/hello.rr
./examples/hello
```

## 📚 Language Quick Start

### Variables & Math
```javascript
let pi = 3.14159;
let r = 10;
let area = pi * Math.pow(r, 2);
console.log(area);
```

### Control Flow
```javascript
if (area > 100) {
    console.log("Big circle!");
}

let arr = [1, 2, 3];
console.log(arr[0]); // Arrays use C++ vectors
```

### Classes (OOP)
```javascript
class Dog {
    let name = "Puppy";
    func bark() {
        console.log("Woof!");
    }
}
let d = new Dog();
d.bark();
```

### Built-in Trees 🌳
RiriLang comes with **AVL**, **BST**, and **Heap** out of the box!

```javascript
// Self-balancing AVL Tree
let tree = new AVL();
tree.insert(50);
tree.insert(10);
tree.insert(20); // Automatically rotates!
tree.printInOrder();

// Max Heap
let pq = new Heap();
pq.push(100);
pq.push(10);
console.log(pq.pop()); // 100
```

## 📖 Syntax Guide

| Feature | Syntax | Description |
| :--- | :--- | :--- |
| **Variables** | `let x = 10;` | Declare a variable (type inferred). |
| **Functions** | `fn add(a, b) { ... }` | Define a function (alias: `func`). |
| **Classes** | `class Dog { ... }` | Define a class with fields and methods. |
| **Instantiation** | `let d = new Dog();` | Create a new instance of a class. |
| **Printing** | `print("Hello", x);` | Print to stdout (alias: `console.log`). |
| **Input** | `let name = input();` | Read a line from stdin. |
| **Imports** | `import "math.rr";` | Import code from another file. |
| **Conditionals** | `if (x > 5) { ... }` | Standard if-else logic. |
| **Loops** | `for (let i=0; i<10; i=i+1)` | Standard C-style for loop. |
| **Switch** | `switch (x) { case 1: ... }` | Switch statement with fallthrough. |
| **Arrays** | `let arr = [1, 2, 3];` | Dynamic arrays (std::vector). |
| **Try-Catch** | `try { ... } catch { ... }` | Handle errors gracefully. |
| **Async/Await** | `async fn foo() { await bar(); }` | Asynchronous function syntax. |
| **Fetch** | `fetch("https://api.com")` | HTTP GET request (blocking). |
| **Table Print** | `tprint(arr)` | Print arrays in a formatted table. |

### Advanced Features 🌟

#### Fetching Data
```javascript
async fn getData() {
    let json = await fetch("https://api.jikan.moe/v4/anime/1");
    print(json.substr(0, 100));
}
```

#### Error Handling
```javascript
try {
    // risky code
} catch {
    print("Something went wrong");
}
```

#### Table Printing
```javascript
let users = ["Alice", "Bob", "Charlie"];
tprint(users);
/*
+----------------+
| Index | Value  |
+----------------+
| 0     | Alice  |
| 1     | Bob    |
...
*/
```

## 📂 Examples
Check out the `examples/` folder for more:
- `examples/full_docs.rr`: **Complete documentation** covering all features.
- `examples/tree_test.rr`: Demo of Tree data structures.
- `examples/oop_test.rr`: Demo of Class usage.

## 📝 License
MIT
