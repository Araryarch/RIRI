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

You can install RiriLang using the pre-built binaries from the [Releases](https://github.com/yourusername/riri-lang/releases) page.

1.  Download the binary for your OS (Linux, Windows, macOS).
2.  Add it to your PATH.
3.  Ensure you have `g++` installed.

**Alternative (Build from Source):**
```bash
# 1. Clone the repository
git clone https://github.com/Araryarch/RIRI.git
cd RIRI

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

### Control Flow
| Syntax | Example | Description |
| :--- | :--- | :--- |
| `if` / `else` | `if (x > 0) { ... } else { ... }` | Conditional execution. |
| `while` | `while (x < 10) { ... }` | Loop while condition is true. |
| `for` | `for (let i=0; i<10; i+=1) { ... }` | C-style for loop. |
| `switch` | `switch (x) { case 1: ... break; }` | Multi-way branching. |
| `try` / `catch` | `try { ... } catch { ... }` | Handle runtime errors. |
| `break` | `break;` | Exit loop or switch. |
| `continue` | `continue;` | Skip to next loop iteration. |

### Reserved Keywords
`let`, `func`, `fn`, `return`, `class`, `new`, `this`, `if`, `else`, `while`, `for`, `switch`, `case`, `default`, `break`, `continue`, `import`, `try`, `catch`, `finally`, `async`, `await`.

### CLI Usage
RiriLang comes with a powerful CLI `rrc` (Riri Compiler).

| Command | Description |
| :--- | :--- |
| `rrc run <file.rr>` | Compile and run the script in one go (Interpreter style). |
| `rrc build <file.rr>` | Compile to a native binary (executable) in the current folder. |
| `rrc <file.rr>` | Alias for `run`. |

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

## 📚 API Reference

### Global Functions
- `print(args...)`: Print values to stdout.
- `input()`: Read a string from stdin.
- `tprint(query)`: Print array or string in table format.
- `fetch(url)`: Perform a blocking HTTP GET request.
- `sort(arr)`: Sort an array in-place (IntroSort).

### Math Library
| Function | Description |
| :--- | :--- |
| `Math.abs(x)` | Absolute value. |
| `Math.ceil(x)` | Round up to nearest integer. |
| `Math.floor(x)` | Round down to nearest integer. |
| `Math.round(x)` | Round to nearest integer. |
| `Math.max(a, b)` | Return larger of two values. |
| `Math.min(a, b)` | Return smaller of two values. |
| `Math.pow(base, exp)` | Power function. |
| `Math.sqrt(x)` | Square root. |
| `Math.log(x)` | Natural logarithm. |
| `Math.exp(x)` | Exponential function (e^x). |
| `Math.random()` | Random number between 0.0 and 1.0. |

### Array Methods
- `arr.push(val)`: Add element to end.
- `arr.pop()`: Remove last element.
- `arr.size()`: Get number of elements.
- `arr.at(index)`: Get element at index with bounds checking.

### String Methods
- `str.length()`: Get string length.
- `str.substr(pos, len)`: Get substring.
- `str.at(index)`: Get character at index.

### Data Structures (Built-in)
RiriLang provides high-performance C++ implementations of common data structures.

#### AVL Tree (Self-Balancing)
```javascript
let tree = new AVL();
tree.insert(10);
tree.printInOrder(); // Prints sorted keys
```

#### Binary Search Tree (BST)
```javascript
let tree = new BST();
tree.insert(10);
if (tree.search(10)) print("Found!");
```

#### Heap (Max Priority Queue)
```javascript
let pq = new Heap();
pq.push(10);
let max = pq.pop(); // 10
```

## 📝 License
MIT
