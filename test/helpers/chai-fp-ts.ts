/// <reference path="./chai-fp-ts.d.ts"/>
import * as Either from 'fp-ts/lib/Either';

interface Chai {
  Assertion: Assertion;
}

interface Assertion {
  _obj: unknown;
  addProperty: (name: string, getter: (this: Assertion) => void) => void;
  assert: (
    result: boolean,
    errorMessage: string,
    errorMessageNegated: string,
  ) => void;
}

interface Utils {
  flag: (assertion: Assertion, key: string, value?: unknown) => void;
}

export default function(chai: Chai, utils: Utils) {
  const Assertion = chai.Assertion;

  function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
  }

  function isEither<L, A>(value: unknown): value is Either.Either<L, A> {
    if (!isObject(value)) {
      return false;
    }
    return Either.isLeft(value as any) || Either.isRight(value as any);
  }

  Assertion.addProperty('left', function() {
    const obj = this._obj;
    let isLeft: boolean = false;

    if (isEither(obj) && Either.isLeft(obj)) {
      utils.flag(this, 'object', obj.left);
      isLeft = true;
    }

    this.assert(
      isLeft,
      `expected #{this} to be Left`,
      `expected #{this} to not be Left`,
    );
  });

  Assertion.addProperty('right', function() {
    const obj = this._obj;
    let isRight: boolean = false;

    if (isEither(obj) && Either.isRight(obj)) {
      utils.flag(this, 'object', obj.right);
      isRight = true;
    }

    this.assert(
      isRight,
      `expected #{this} to be Right`,
      `expected #{this} to not be Right`,
    );
  });
}
