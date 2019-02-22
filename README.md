# `io-ts-promise`

[`io-ts`](https://github.com/gcanti/io-ts) for developers who feel more comfortable with [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) than with [Eithers](https://github.com/gcanti/fp-ts/blob/master/docs/Either.md).

While `io-ts` is a great library, it can be a bit alienatig unless you are well versed in the language of functional programming. But if you just want to ensure the runtime types of the data fetched from your API, you might be looking for something simpler. This is where `io-ts-promise` tries to help out.

## Usage

The library enables you to do the following with conventions familiar to Promises.

### Simple decoding

Decode data from Promise based APIs without having to worry about how to retrieve the data from Either values.

```typescript
import * as t from 'io-ts';
import * as tPromise from 'io-ts-promise';

const DataType = t.type({
  name: t.string,
  age: t.number,
});

fetch('http://example.com/api/person')
  .then(response => response.json())
  .then(data => tPromise.decode(DataType, data))
  .then(typesafeData =>
    console.log(`${typesafeData.name} is ${typesafeData.age} years old`)
  );
```

`tPromise.decode` also supports currying, so you can shorten your code with

```typescript
fetch('http://example.com/api/person')
  .then(response => response.json())
  .then(tPromise.decode(DataType))
  .then(typesafeData =>
    console.log(`${typesafeData.name} is ${typesafeData.age} years old`)
  );
```

### Simpler custom types

Writing proper custom io-ts types is a bit cryptic, so this library provides a simpler way of extending existing io-ts types, or creating your own from scratch. All you need is a function which decodes incoming values, and another which encodes it back.

```typescript
import * as t from 'io-ts';
import * as tPromise from 'io-ts-promise';

// Custom type from scratch
const price = tPromise.createType(
  // Decode function takes in unknown and produces wanted type
  (value: unknown) => {
    if (typeof value === 'number') {
      return {
        currency: 'EUR',
        value,
      };
    } else {
      throw new Error('Input is not a number');
    }
  },
  // Encode function does the reverse
  value => value.value
);

// Alternatively, you can extend existing types
const price = tPromise.extendType(
  t.number,
  (value: number) => ({
    currency: 'EUR',
    value,
  }),
  value => value.value
);
```

### Simpler decoders

In case you only need to read data into your application, you can use decoders which only convert data in one way.

**Note:** `io-ts` doesn't support decoders in its nested types such as `t.array` or `t.type`. So only use decoders for top level data structures. The `decode` function of this library suppports plain decoders as well.

```typescript
import * as tPromise from 'io-ts-promise';

// Either create a decoder from scratch
const priceDecoder = tPromise.createDecoder((value: unknown) => {
  if (typeof value === 'number') {
    return {
      currency: 'EUR',
      value,
    };
  } else {
    throw new Error('Input is not a number');
  }
});

// Or extend an existing io-ts type
const priceDecoder = tPromise.extendDecoder(t.number, (value: number) => ({
  currency: 'EUR',
  value,
}));
```
