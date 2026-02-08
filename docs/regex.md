# Regex Support in RiriLang

RiriLang provides built-in support for Regular Expressions using the `Regex` class.

## Usage

```javascript
// Create a regex pattern
let r = new Regex("pattern");

// Match a string (returns true/false)
if (r.match("input string")) {
    print("Matched!");
}

// Replace content
let original = "Hello 123";
let r_digits = new Regex("[0-9]+");
let clean = r_digits.replace(original, ""); // "Hello "
```

## Methods

-   `match(string)`: Returns `1` (true) if the pattern is found in the string, `0` (false) otherwise.
-   `replace(string, replacement)`: Returns a new string with matches replaced by `replacement`.

## Under the Hood
It uses C++ `std::regex` (ECMAScript syntax by default).
