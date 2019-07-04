# `io-ts-promise`

While [`io-ts`](https://github.com/gcanti/io-ts) is a great library, it can be a bit alienating unless you are familiar with functional programming. So if you just want to ensure the runtime types for the data fetched from your API, you might be looking for something simpler. This is where `io-ts-promise` tries to help out.

It provides the following:

- [Promise chain decoding](#promise-chain-decoding) using `io-ts` types.
- [Creating custom types](#creating-custom-types) using promise conventions.

## Usage

### Promise chain decoding

Decode data from Promise based APIs, without having to worry about how to retrieve data from the [Either](https://gcanti.github.io/fp-ts/modules/Either.ts.html) values returned by the `io-ts` types.

```typescript
import * as t from 'io-ts';
import * as tPromise from 'io-ts-promise';

const Person = t.type({
  name: t.string,
  age: t.number,
});

fetch('http://example.com/api/person')
  .then(response => tPromise.decode(Person, response.json()))
  .then(typeSafeData =>
    console.log(`${typeSafeData.name} is ${typeSafeData.age} years old`),
  );
```

`tPromise.decode` also supports currying, so we can simplify the code with

```typescript
fetch('http://example.com/api/person')
  .then(response => response.json())
  .then(tPromise.decode(Person))
  .then(typeSafeData =>
    console.log(`${typeSafeData.name} is ${typeSafeData.age} years old`),
  );
```

As with any Promise-based API, you can also use `tPromise.decode` in async code as following

```typescript
const response = await fetch('http://example.com/api/person');
const typeSafeData = await tPromise.decode(Person, response.json());
console.log(`${typeSafeData.name} is ${typeSafeData.age} years old`);
```

#### Identifying errors

When building long promise chains, you might handle errors somewhere else than directly next to the function producing the error. In these cases you might want to identify the errors in order to act accordingly. Errors produced by the `decode` function due to incompatible data can be identified by either using the type guard `tPromise.isDecodeError(error)`, or checking the error type with `error instanceof tPromise.DecodeError`. For example:

```typescript
fetch('http://example.com/api/not-a-person')
  .then(response => response.json())
  .then(tPromise.decode(Person))
  .then(typeSafeData =>
    console.log(`${typeSafeData.name} is ${typeSafeData.age} years old`),
  )
  .catch(error => {
    if (tPromise.isDecodeError(error)) {
      console.error('Request failed due to invalid data.');
    } else {
      console.error('Request failed due to network issues.');
    }
  });
```

### Creating custom types

Writing custom `io-ts` types is a bit cryptic, so this library provides a simpler way of extending existing `io-ts` types, or creating your own from scratch. All you need is a function which decodes incoming values, and another which encodes it back.

```typescript
import * as t from 'io-ts';
import * as tPromise from 'io-ts-promise';

// New type extending from existing type
const Price = tPromise.extendType(
  t.number,
  // Decode function takes in number and produces wanted type
  (value: number) => ({
    currency: 'EUR',
    amount: value,
  }),
  // Encode function does the reverse
  price => price.amount,
);

// And use them as part of other types
const Product = t.type({
  name: t.string,
  price: Price,
});

fetch('http://example.com/api/product')
  .then(response => response.json())
  .then(tPromise.decode(Product))
  .then(typeSafeData =>
    console.log(
      `${typeSafeData.name} costs ${typeSafeData.price.amount} ${
        typeSafeData.price.currency
      }`,
    ),
  );
```

Alternatively, you can define the type from scratch, in which case the decoder will receive a value of `unknown` type to decode into desired runtime type.

```typescript
// Custom type from scratch
const Price = tPromise.createType(
  // Decode function takes in unknown and produces wanted type
  (value: unknown) => {
    if (typeof value === 'number') {
      return {
        currency: 'EUR',
        amount: value,
      };
    } else {
      throw new Error('Input is not a number');
    }
  },
  // Encode function does the reverse
  price => price.amount,
);
```

#### Decoders

In case you only need to read data into your application, you can use decoders which only convert data in one way.

**Note:** `io-ts` doesn't support decoders in its nested types such as `t.array` or `t.type`. So only use decoders for top level data structures. The `decode` function of this library suppports both types and decoders.

The easiest way is to create a decoder is to extend and existing `io-ts` type, and only perform the desired additional modification on top of that.

```typescript
import * as tPromise from 'io-ts-promise';

const Person = t.type({
  name: t.string,
  age: t.number,
});

const ExplicitPerson = tPromise.extendDecoder(Person, person => ({
  firstName: person.name,
  ageInYears: person.age,
}));

fetch('http://example.com/api/person')
  .then(response => tPromise.decode(ExplicitPerson, response.json()))
  .then(typeSafeData =>
    console.log(
      `${typeSafeData.firstName} is ${typeSafeData.ageInYears} years old`,
    ),
  );
```

You can also create decoders from scratch using `createDecoder`, but I have yet to find a good example of where this would be convenient.
