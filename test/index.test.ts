import { describe, expect, it } from 'vitest';

import * as t from 'io-ts';

import './helpers/vitest-fp-ts';

import * as tPromise from '../src';

describe('io-ts-promise', () => {
  describe('readme examples', () => {
    const fetch = (url: string): Promise<{ json: () => unknown }> => {
      switch (url) {
        case 'http://example.com/api/person':
          return Promise.resolve({
            json: () => ({
              name: 'Tester',
              age: 24,
            }),
          });
        case 'http://example.com/api/not-a-person':
          return Promise.resolve({
            json: () => ({}),
          });
        case 'http://example.com/api/product':
          return Promise.resolve({
            json: () => ({
              name: 'Product',
              price: 10,
            }),
          });
        default:
          return Promise.reject('404');
      }
    };

    it('provides promise chain decoding', () => {
      const Person = t.type({
        name: t.string,
        age: t.number,
      });

      const result = fetch('http://example.com/api/person')
        .then((response) => tPromise.decode(Person, response.json()))
        .then(
          (typeSafeData) =>
            `${typeSafeData.name} is ${typeSafeData.age} years old`,
        );

      return expect(result).resolves.toEqual('Tester is 24 years old');
    });

    it('provides promise chain decoding with carrying', () => {
      const Person = t.type({
        name: t.string,
        age: t.number,
      });

      const result = fetch('http://example.com/api/person')
        .then((response) => response.json())
        .then(tPromise.decode(Person))
        .then(
          (typeSafeData) =>
            `${typeSafeData.name} is ${typeSafeData.age} years old`,
        );

      return expect(result).resolves.toEqual('Tester is 24 years old');
    });

    it('provides async based decoding', async () => {
      const Person = t.type({
        name: t.string,
        age: t.number,
      });

      const response = await fetch('http://example.com/api/person');
      const typeSafeData = await tPromise.decode(Person, response.json());
      const result = `${typeSafeData.name} is ${typeSafeData.age} years old`;

      expect(result).toEqual('Tester is 24 years old');
    });

    it('provides identification of decode errors', () => {
      const Person = t.type({
        name: t.string,
        age: t.number,
      });

      const result = fetch('http://example.com/api/not-a-person')
        .then((response) => response.json())
        .then(tPromise.decode(Person))
        .then(
          (typeSafeData) =>
            `${typeSafeData.name} is ${typeSafeData.age} years old`,
        )
        .catch((error) => {
          if (tPromise.isDecodeError(error)) {
            return 'Request failed due to invalid data.';
          } else {
            return 'Request failed due to network issues.';
          }
        });

      return expect(result).resolves.toEqual(
        'Request failed due to invalid data.',
      );
    });

    it('provides creating custom types by extending existing types', () => {
      // New type extending from existing type
      const Price = tPromise.extendType(
        t.number,
        // Decode function takes in number and produces wanted type
        (value: number) => ({
          currency: 'EUR',
          amount: value,
        }),
        // Encode function does the reverse
        (price) => price.amount,
      );

      // And use them as part of other types
      const Product = t.type({
        name: t.string,
        price: Price,
      });

      const result = fetch('http://example.com/api/product')
        .then((response) => response.json())
        .then(tPromise.decode(Product))
        .then(
          (typeSafeData) =>
            `${typeSafeData.name} costs ${typeSafeData.price.amount} ${typeSafeData.price.currency}`,
        );

      return expect(result).resolves.toEqual('Product costs 10 EUR');
    });

    it('provides creating custom types from scratch', () => {
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
        (price) => price.amount,
      );

      // And use them as part of other types
      const Product = t.type({
        name: t.string,
        price: Price,
      });

      const result = fetch('http://example.com/api/product')
        .then((response) => response.json())
        .then(tPromise.decode(Product))
        .then(
          (typeSafeData) =>
            `${typeSafeData.name} costs ${typeSafeData.price.amount} ${typeSafeData.price.currency}`,
        );

      return expect(result).resolves.toEqual('Product costs 10 EUR');
    });

    it('provides creating custom decoders by extending existing io-ts types', () => {
      const Person = t.type({
        name: t.string,
        age: t.number,
      });

      const ExplicitPerson = tPromise.extendDecoder(Person, (person) => ({
        firstName: person.name,
        ageInYears: person.age,
      }));

      const result = fetch('http://example.com/api/person')
        .then((response) => tPromise.decode(ExplicitPerson, response.json()))
        .then(
          (typeSafeData) =>
            `${typeSafeData.firstName} is ${typeSafeData.ageInYears} years old`,
        );

      return expect(result).resolves.toEqual('Tester is 24 years old');
    });
  });

  describe('decode', () => {
    it('resolves promise on valid data', () => {
      const type = t.string;
      const value = 'hello there';

      return expect(tPromise.decode(type, value)).resolves.toEqual(value);
    });

    it('resolves promise on falsy string', () => {
      const type = t.string;
      const value = '';

      return expect(tPromise.decode(type, value)).resolves.toEqual(value);
    });

    it('resolves promise on falsy boolean', () => {
      const type = t.boolean;
      const value = false;

      return expect(tPromise.decode(type, value)).resolves.toEqual(value);
    });

    it('resolves promise on falsy number', () => {
      const type = t.number;
      const value = 0;

      return expect(tPromise.decode(type, value)).resolves.toEqual(value);
    });

    it('resolves promise on falsy undefined', () => {
      const type = t.undefined;
      const value = undefined;

      return expect(tPromise.decode(type, value)).resolves.toEqual(value);
    });

    it('resolves promise on falsy null', () => {
      const type = t.null;
      const value = null;

      return expect(tPromise.decode(type, value)).resolves.toEqual(value);
    });

    it('rejects promise on invalid data', () => {
      const type = t.string;
      const value = 10;

      return expect(tPromise.decode(type, value)).rejects.toBeInstanceOf(
        tPromise.DecodeError,
      );
    });
  });

  describe('decode with curry', () => {
    it('resolves promise on valid data', () => {
      const type = t.string;
      const value = 'hello there';

      return expect(tPromise.decode(type)(value)).resolves.toEqual(value);
    });

    it('rejects promise on invalid data', () => {
      const type = t.string;
      const value = 10;

      return expect(tPromise.decode(type)(value)).rejects.toBeInstanceOf(
        tPromise.DecodeError,
      );
    });
  });

  describe('isDecodeError', () => {
    it('identifies errors produced by decode', () => {
      const failingPromise = tPromise.decode(t.string, 10);

      return expect(failingPromise).rejects.toSatisfy(tPromise.isDecodeError);
    });

    it('identifies other errors', () => {
      const nonDecodeError = new Error('test-error');

      expect(tPromise.isDecodeError(nonDecodeError)).toEqual(false);
    });
  });

  describe('createType', () => {
    const price = tPromise.createType(
      (value: unknown) => {
        if (typeof value === 'number') {
          return {
            currency: 'EUR',
            value,
          };
        } else {
          throw new Error();
        }
      },
      (value) => value.value,
    );

    runPriceTypeTests(price);
  });

  describe('extendType', () => {
    const price = tPromise.extendType(
      t.number,
      (value: number) => ({
        currency: 'EUR',
        value,
      }),
      (value) => value.value,
    );

    runPriceTypeTests(price);
  });

  function runPriceTypeTests(
    price: t.Type<{ currency: string; value: number }, unknown, unknown>,
  ) {
    it('produces type which decodes valid values', () => {
      const result = price.decode(10);

      expect(result).toEqualRight({
        currency: 'EUR',
        value: 10,
      });
    });

    it('produces type which decodes values nested in io-ts types', () => {
      const product = t.type({
        name: t.string,
        price,
      });

      const result = product.decode({
        name: 'thing',
        price: 99,
      });

      expect(result).toEqualRight({
        name: 'thing',
        price: {
          currency: 'EUR',
          value: 99,
        },
      });
    });

    it('fails to decode invalid values', () => {
      const result = price.decode('10€');

      expect(result).toEqualLeft([
        {
          context: expect.anything(),
          value: '10€',
        },
      ]);
    });

    it('produces type which identifies matching values with typeguard', () => {
      expect(
        price.is({
          currency: 'EUR',
          value: 10,
        }),
      ).toEqual(true);
    });

    it('produces type which identifies nonmatching values with typeguard', () => {
      expect(price.is('10€')).toEqual(false);
      expect(price.is(10)).toEqual(false);

      expect(
        price.is({
          sum: 10,
        }),
      ).toEqual(false);

      expect(
        price.is({
          currency: 'USD',
          value: 10,
        }),
      ).toEqual(false);
    });
  }

  describe('createDecoder', () => {
    const price = tPromise.createDecoder((value: unknown) => {
      if (typeof value === 'number') {
        return {
          currency: 'EUR',
          value,
        };
      } else {
        throw new Error();
      }
    });

    runPriceDecoderTests(price);
  });

  describe('extendDecoder', () => {
    const price = tPromise.extendDecoder(t.number, (value: number) => ({
      currency: 'EUR',
      value,
    }));

    runPriceDecoderTests(price);
  });

  function runPriceDecoderTests(
    price: t.Decoder<
      unknown,
      {
        currency: string;
        value: number;
      }
    >,
  ) {
    it('produces decoder which succeeds to decode valid values', () => {
      const result = price.decode(10);

      expect(result).toEqualRight({
        currency: 'EUR',
        value: 10,
      });
    });

    it('produces decoder which fails to decode invalid values', () => {
      const result = price.decode('10€');

      expect(result).toEqualLeft([
        {
          context: expect.anything(),
          value: '10€',
        },
      ]);
    });
  }
});
