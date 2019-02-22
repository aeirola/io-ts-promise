import * as chai from 'chai';
import * as chatAsPromised from 'chai-as-promised';
import 'mocha';

chai.use(chatAsPromised);
const expect = chai.expect;

import * as t from 'io-ts';

const value: unknown = 345634;

if (t.string.is(value)) {
  value.toUpperCase();
}

import * as tPromise from '../src';

describe('io-ts-promise', () => {
  describe('readme examples', () => {
    const fetch = (_: string) =>
      Promise.resolve({
        json: () => ({
          name: 'Tester',
          age: 24,
        }),
      });

    it('supports simple decoding', () => {
      const DataType = t.type({
        name: t.string,
        age: t.number,
      });

      const result = fetch('http://example.com/api/person')
        .then(response => response.json())
        .then(data => tPromise.decode(DataType, data))
        .then(
          typesafeData =>
            `${typesafeData.name} is ${typesafeData.age} years old`
        );

      return expect(result).to.eventually.equal('Tester is 24 years old');
    });

    it('supports simple decoding with carrying', () => {
      const DataType = t.type({
        name: t.string,
        age: t.number,
      });

      const result = fetch('http://example.com/api/person')
        .then(response => response.json())
        .then(tPromise.decode(DataType))
        .then(
          typesafeData =>
            `${typesafeData.name} is ${typesafeData.age} years old`
        );

      return expect(result).to.eventually.equal('Tester is 24 years old');
    });
  });

  describe('decode', () => {
    it('resolves promise on valid data', () => {
      const type = t.string;
      const value = 'hello there';

      return expect(tPromise.decode(type, value)).to.eventually.equal(value);
    });

    it('rejects promise on invalid data', () => {
      const type = t.number;
      const value = 'hello there';

      return expect(tPromise.decode(type, value)).to.eventually.be.rejectedWith(
        Error
      );
    });
  });

  describe('decode with curry', () => {
    it('resolves promise on valid data', () => {
      const type = t.string;
      const curriedType = tPromise.decode(type);
      const value = 'hello there';

      return expect(curriedType(value)).to.eventually.equal(value);
    });

    it('rejects promise on invalid data', () => {
      const type = t.number;
      const curriedType = tPromise.decode(type);
      const value = 'hello there';

      return expect(curriedType(value)).to.eventually.be.rejectedWith(Error);
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
          throw new Error('Input is not a number');
        }
      },
      value => value.value
    );

    it('decodes valid values', () => {
      const result = price.decode(10);

      expect(result).to.deep.equal(
        t.success({
          currency: 'EUR',
          value: 10,
        })
      );
    });

    it('decodes values nested in io-ts types', () => {
      const product = t.type({
        name: t.string,
        price,
      });

      const result = product.decode({
        name: 'thing',
        price: 99,
      });

      expect(result).to.deep.equal(
        t.success({
          name: 'thing',
          price: {
            currency: 'EUR',
            value: 99,
          },
        })
      );
    });

    it('fails to decode invalid values', () => {
      const result = price.decode('10€');

      expect(result.isLeft()).to.equal(true);
    });

    it('identifies matching values with typeguard', () => {
      expect(
        price.is({
          currency: 'EUR',
          value: 10,
        })
      ).to.equal(true);
    });

    it('identifies nonmatching values with typeguard', () => {
      expect(price.is('10€')).to.equal(false);
      expect(price.is(10)).to.equal(false);
      expect(
        price.is({
          sum: 10,
        })
      ).to.equal(false);
    });
  });

  describe('extendType', () => {
    const price = tPromise.extendType(
      t.number,
      (value: number) => ({
        currency: 'EUR',
        value,
      }),
      value => value.value
    );

    it('decodes valid values', () => {
      const result = price.decode(10);

      expect(result).to.deep.equal(
        t.success({
          currency: 'EUR',
          value: 10,
        })
      );
    });

    it('decodes values nested in io-ts types', () => {
      const product = t.type({
        name: t.string,
        price,
      });

      const result = product.decode({
        name: 'thing',
        price: 99,
      });

      expect(result).to.deep.equal(
        t.success({
          name: 'thing',
          price: {
            currency: 'EUR',
            value: 99,
          },
        })
      );
    });

    it('fails to decode invalid values', () => {
      const result = price.decode('10€');

      expect(result.isLeft()).to.equal(true);
    });

    it('identifies matching values with typeguard', () => {
      expect(
        price.is({
          currency: 'EUR',
          value: 10,
        })
      ).to.equal(true);
    });

    it('identifies nonmatching values with typeguard', () => {
      expect(price.is('10€')).to.equal(false);
      expect(price.is(10)).to.equal(false);
      expect(
        price.is({
          sum: 10,
        })
      ).to.equal(false);
    });
  });
});
