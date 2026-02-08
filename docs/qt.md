# Qt GUI Development

RiriLang supports creating native GUI applications using the powerful Qt framework (Qt 5 or Qt 6).

## Prerequisite
You must have Qt development libraries installed on your system.
-   Ubuntu/Debian: `sudo apt install qtbase5-dev`
-   macOS: `brew install qt`

## Usage (CLI)
Pass the `--qt` flag when compiling or running:

```bash
rrc run my_app.rr --qt
```

This flag tells the compiler to link against Qt libraries (using `pkg-config`).

## Writing a Qt App
RiriLang provides a **DOM-like Syntax** (similar to HTML/JS) for building native Qt interfaces. This abstracts away C++ complexity.

```javascript
// 1. Initialize App
let argc = 0;
let app = new QApplication(argc, nullptr);
let document = new Document();

// 2. Create Elements
let window = document.createElement("window");
let btn = document.createElement("button");

// 3. Set Attributes
window.setAttribute("title", "My App");
btn.setAttribute("text", "Click Me");
btn.setAttribute("style", "background-color: blue; color: white; padding: 10px;");

// 4. Handle Events
btn.addEventListener("click", () => {
    print("Button Clicked!");
});

// 5. Build Hierarchy
window.appendChild(btn);

// 6. Run
window.show();
app.exec();
```

## API Reference

### `Document`
-   `new Document()`: Creates a factory instance.
-   `createElement(tag)`: Creates a new element. Supported tags:
    -   `"window"`: Main window (Auto-layout: Vertical).
    -   `"div"`: Vertical container (VBox).
    -   `"span"`: Horizontal container (HBox).
    -   `"button"`: Button.
    -   `"label"`: Text label.
    -   `"input"`: Text input field.

### `QtElement`
Returned by `createElement()`.
-   `setAttribute(name, value)`: Sets properties.
    -   `"text"`: Content text.
    -   `"title"`: Window title.
    -   `"style"`: CSS-like styling (passed to Qt stylesheet).
-   `appendChild(child)`: Adds a child element.
-   `addEventListener(event, callback)`: Connects signals.
    -   `"click"`: Button click.
-   `show()`: Displays the element (usually called on window).

## Example
See `tests/16_qt_calculator.rr` for a complete calculator implementation.
