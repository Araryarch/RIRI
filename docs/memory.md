# Memory Management

RiriLang uses **Automatic Reference Counting (ARC)** handling via C++ `std::shared_ptr`.

## How it works
-   When you create an object using `new ClassName()`, it is wrapped in a smart pointer.
-   When you assign it to a variable or field, the reference count increases.
-   When a variable goes out of scope or is reassigned, the count decreases.
-   When the count reaches zero, the memory is automatically freed.

## Benefits
-   No manual `delete` or `free` required.
-   Prevents memory leaks and dangling pointers (mostly).
-   Safe sharing of objects between functions and data structures.

## Limitation (Cycles)
Like Swift or Python (mostly), simple reference counting cannot handle reference cycles (e.g., A refers to B, B refers to A, and no one else refers to them). In the future, weak references might be added.
