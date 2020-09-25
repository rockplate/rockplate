[![MIT License](https://img.shields.io/github/license/rockplate/rockplate)](https://github.com/rockplate/rockplate/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/rockplate/rockplate.png?branch=master)](https://travis-ci.com/rockplate/rockplate)
[![codecov.io Code Coverage](https://img.shields.io/codecov/c/github/rockplate/rockplate.svg?maxAge=2592000)](https://codecov.io/github/rockplate/rockplate?branch=master)
[![dependencies Status](https://david-dm.org/rockplate/rockplate/status.svg)](https://david-dm.org/rockplate/rockplate)
[![devDependencies Status](https://david-dm.org/rockplate/rockplate/dev-status.svg)](https://david-dm.org/rockplate/rockplate?type=dev)
[![HitCount](https://hits.dwyl.com/rockplate/rockplate.svg)](https://hits.dwyl.com/rockplate/rockplate)

# [🤘] Rockplate

Next generation programming language for Email, SMS, Receipt, Invoice, HTML and other templates with built in Linter, official CodeMirror & VSCode IntelliSense extension, no dependencies, 5kb minified & gzipped, 100% code coverage.

![Rockplate Demo](https://raw.githubusercontent.com/rockplate/rockplate-vscode/master/images/rockplate-demo.gif)


## Features

- Data First approach with Schema validation
- Semantic, Natural Syntax with Flawless Lexical Scoping
- Built in [Linter](https://rockplate.github.io/linter)
- Official [Tools](https://rockplate.github.io/tools)
- Battle-tested with 🔥 **100%** code coverage
- Written in TypeScript, no dependencies, `5kb` minified, gzipped
- Zero RegEx lexer/AST builder (High performance and high security)
- Can be used for Email, SMS, Receipt, Invoice, HTML and other templates

## [Documentation and Demo](https://rockplate.github.io/)

[Click here](https://rockplate.github.io/) for full documentation with demo and examples.

## Quick Docs

### Installation

`npm install rockplate`

### Usage

TypeScript/JavaScript

```javascript
import { Rockplate } from 'rockplate';

const template = 'My name is [my name]';
const schema = {
  my: {
    name: 'My Name',
  },
};
const rpl = new Rockplate(template, schema);
const output = rpl.parse({
  // you will get type hints
  // for properties in schema as you type
  my: {
    name: 'Safraz Razik',
  },
});
console.log(output); // My name is Safraz Razik
```

## Syntax and Schema/Data structure

> Limitations are good - for a templating language

### Booleans

Values: `true` | `false`

```javascript
{
  "order" : {
    "paid": true
  },
  "vegetables": {
    "fresh": true // example for " are " operator
  }

}
```

Syntax: `[if order is paid] .... [end if]`

Operators: `is` | `are` | `is not` | `are not`

```pascal
[if order is paid]
  Paid
[else]
  Unpaid
[end if]
```

```pascal
I eat
[if vegetables are fresh]
  healthy
[end if]
vegetables 🥕🥦🍅🍆🥝🥬🥒🌶
```

### Identifers

Values: `string` | `number` or `any` printable value

```javascript
{
  "order" : {
    "ref": "210045-674558-981560"
  }
}
```

Syntax: `[order ref]`

```rpl
Thank you for your order [order ref]
```

### Arrays

Value: Collection of `Booleans` or `Identifers`

```javascript
{
  "orders" : [
    {
      "order" : {
        "status": "Paid",
        "ref": "210045-674558-981560"
      },
      "discount" : {
        "available": false,
        "amount": "5%"
      }
    }
  ]
}
```

Syntax: `[repeat orders] .... [end repeat]`

```pascal
Your orders:
[repeat orders]

 Ref: [order ref]

 Status: [order status]

 [if discount is available]
   Discount: [discount amount]
 [end if]

[end repeat]
```

<!-- NOTE: pascal has nothing to do with rockplate.
Keywords of rockplate are keywords of pascal, so it has been used for syntax highlighting -->
