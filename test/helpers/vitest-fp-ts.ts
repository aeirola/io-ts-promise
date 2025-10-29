import { expect } from 'vitest';
import * as Either from 'fp-ts/lib/Either';

interface FpTsMatchers<R = unknown> {
  toEqualLeft(expected: unknown): R;
  toEqualRight(expected: unknown): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends FpTsMatchers<T> {}
  interface AsymmetricMatchersContaining extends FpTsMatchers {}
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isEither<L, A>(value: unknown): value is Either.Either<L, A> {
  if (!isObject(value)) {
    return false;
  }
  return Either.isLeft(value as any) || Either.isRight(value as any);
}

expect.extend({
  toEqualLeft(received: unknown, expected: unknown) {
    const { equals } = this;

    if (!isEither(received)) {
      return {
        pass: false,
        message: () => 'expected value to be an instance of Either',
        actual: received,
        expected: Either.left(expected),
      };
    }

    if (Either.isRight(received)) {
      return {
        pass: false,
        message: () => 'expected value to be Left, but got Right',
        actual: received,
        expected: Either.left(expected),
      };
    }

    const pass = equals(received.left, expected);

    return {
      pass,
      message: () => 'expected Left value to equal',
      actual: received.left,
      expected,
    };
  },

  toEqualRight(received: unknown, expected: unknown) {
    const { equals } = this;

    if (!isEither(received)) {
      return {
        pass: false,
        message: () => 'expected value to be an instance of Either',
        actual: received,
        expected: Either.right(expected),
      };
    }

    if (Either.isLeft(received)) {
      return {
        pass: false,
        message: () => 'expected value to be Right, but got Left',
        actual: received,
        expected: Either.right(expected),
      };
    }

    const pass = equals(received.right, expected);

    return {
      pass,
      message: () => 'expected Right value to equal',
      actual: received.right,
      expected,
    };
  },
});
