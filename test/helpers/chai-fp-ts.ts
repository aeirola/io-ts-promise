/// <reference path="./chai-fp-ts.d.ts"/>

import * as Either from 'fp-ts/lib/Either';

const chaiFpTs: Chai.ChaiPlugin = (chai, utils) => {
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
      undefined,
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
      undefined,
    );
  });
};

export default chaiFpTs;
