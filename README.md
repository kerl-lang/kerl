<p align="center">
  <img src="kerl-logo.svg" width="96" alt="Kerl logo"/>
</p>

<h1 align="center">Kerl</h1>

<p align="center">
 Kerl is a minimalist language with native reactivity.
<br/>
  Scripts, automations and servers with a clean syntax.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.4.0-a855f7?style=flat-square"/>
  <img src="https://img.shields.io/badge/license-MIT-a855f7?style=flat-square"/>
  <img src="https://img.shields.io/badge/node-%3E%3D18-a855f7?style=flat-square"/>
</p>

> Created by Dylan J. Walker · NanoSoft

---

## Features

- Clean, readable syntax inspired by Python
- **Reactive variables** via `watch()` — values that update automatically when their source changes
- **Module system** via `load()` — split code across `.ke` files
- First-class functions with closures
- Arrays, dicts, `for`/`while` loops, `if`/`elif`/`else`
- Built-in standard library (math, string, array, type utilities)
- Interactive REPL

---

## Installation

**Requirements:** Node.js v18+

```bash
git clone https://github.com/kerl-lang/kerl.git
cd kerl
npm install
npm run build
npm link
```

After linking, the `kerl` command is available globally.

---

## Usage

```bash
# Run a script
kerl script.ke

# Start the REPL
kerl repl

# Print version
kerl -v
```

---

## Language Guide

### Variables

```kerl
var name = "Kerl"
var version = 1
var active = true
var empty = null
```

### Functions

```kerl
func add(a, b) {
    return a + b
}

print(add(3, 4)) # 7
```

### Conditionals

```kerl
var score = 8

if score >= 9 {
    print("Excellent!")
} elif score >= 7 {
    print("Passed!")
} else {
    print("Failed")
}
```

### Loops

```kerl
# for-in
for i in range(1, 6) {
    print(i)
}

# while
var i = 0
while i < 5 {
    print(i)
    i = i + 1
}
```

### Arrays & Dicts

```kerl
var fruits = ["apple", "banana", "orange"]
push(fruits, "mango")
print(fruits[0]) # apple
print(len(fruits)) # 4

var person = {"name": "Dylan", "age": 18}
print(person["name"])  # Dylan
```

### Reactive Variables (`watch`)

One of Kerl's standout features. A reactive variable automatically recomputes whenever its source changes:

```kerl
var x = 10

func double(v) {
    return v * 2
}

var result = watch(x, double)
print(result) # 20

x = 5
print(result) # 10  ← updated automatically!
```

Real-world example — temperature converter:

```kerl
var temp_c = 0

func toFahrenheit(v) {
    return v * 9 / 5 + 32
}

var temp_f = watch(temp_c, toFahrenheit)

print(temp_f) # 32
temp_c = 100
print(temp_f) # 212
temp_c = 37
print(temp_f) # 98.6
```

### Modules (`load`)

Split your code into `.ke` files and load them as modules:

```kerl
# math.ke
func square(n) {
    return n * n
}
var PI = 3.14159265358979
```

```kerl
# main.ke
var math = load("./math.ke")
print(math.square(5)) # 25
print(math.PI) # 3.14159265358979
```

---

## Standard Library

| Function | Description |
|---|---|
| `len(x)` | Length of string, array, or dict |
| `str(x)` | Convert to string |
| `num(x)` | Convert to number |
| `type(x)` | Return type as string |
| `range(start, end)` | Generate integer array |
| `push(arr, val)` | Append to array |
| `pop(arr)` | Remove and return last element |
| `keys(dict)` | Array of dict keys |
| `values(dict)` | Array of dict values |
| `contains(arr, val)` | Check if value exists |
| `slice(arr, start, end)` | Slice array |
| `reverse(arr)` | Reverse array |
| `split(str, sep)` | Split string into array |
| `join(arr, sep)` | Join array into string |
| `upper(str)` | Uppercase string |
| `lower(str)` | Lowercase string |
| `floor(n)` | Floor of number |
| `ceil(n)` | Ceiling of number |
| `round(n)` | Round number |
| `abs(n)` | Absolute value |
| `sqrt(n)` | Square root |
| `max(...)` | Maximum value |
| `min(...)` | Minimum value |
| `random()` | Random float 0–1 |
| `load(path)` | Load a `.ke` module |
| `watch(var, fn)` | Create a reactive variable |

---

## Examples

The `examples/` directory includes:

| File | Description |
|---|---|
| `fizzbuzz.ke` | Classic FizzBuzz |
| `math.ke` | Math utility functions module |
| `modules.ke` | Module loading demo |
| `watch.ke` | Reactive variables demo |
| `sort.ke` | Sorting algorithms |
| `test.ke` | Full language feature showcase |

---

## Development

```bash
npm run build # Compile TypeScript → dist/
npm run dev # Run with ts-node (no build needed)
npm test # Run examples/test.ke
npm run repl # Start REPL via ts-node
```

---

## License

MIT © Dylan J. Walker
