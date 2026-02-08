# RiriLang Standard Library

## I/O
-   `print(value)`: Prints `value` to stdout with a newline. Supports strings, numbers, booleans.

## Arrays
Arrays are dynamic heterogenous lists.
-   `push(value)`: Appends to array.
-   `pop()`: Removes and returns last element.
-   `len()`: Returns length.
-   **Indexing**: `arr[i]`. Valid indices `0` to `len()-1`.

```javascript
let a = [];
a.push(10);
print(a[0]); // 10
```

## Strings
Strings are mutable.
-   `len()`: Returns length.
-   `+`: Concatenation (`"a" + "b"`).
-   `==`: Equality check.

## Math
-   `Math.PI`
-   `Math.sqrt(x)`
-   `Math.pow(x, y)`
-   `Math.abs(x)`
-   `Math.sin(x)`, `Math.cos(x)`, `Math.tan(x)`

## Type Conversions
-   `string(x)`: Converts number/bool to string.
-   `int(x)`: Parses string to integer.
