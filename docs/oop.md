# Object Oriented Programming

RiriLang supports classes, inheritance, and polymorphism.

## Definition
```javascript
class Animal {
    init(name) {
        this.name = name;
    }
    speak() {
        print(this.name + " makes a sound.");
    }
}
```

## Inheritance
Use `extends` keyword. Base class constructor is NOT called automatically, you must initialize manually if needed (super calls not yet supported).

```javascript
class Dog extends Animal {
    speak() {
        print(this.name + " barks.");
    }
}
```

## Instantiation
```javascript
let d = new Dog("Buddy");
d.speak(); // "Buddy barks."
```

## Method Overriding
Methods in subclasses override base class methods. All methods are virtual by default.
