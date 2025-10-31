import deepEqual from 'deep-equal';
import * as Either from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

/**
 * Creates a function which takes incoming values and decodes them with the given io-ts type,
 * returning a promise reflecting the result.
 *
 * @param type io-ts type to use for decoding incoming values.
 */
export function decode<Output, Input>(
  type: t.Decoder<Input, Output>,
): (value: Input) => Promise<Output>;
/**
 * Decodes values using io-ts types, returning a promise reflecting the result.
 *
 * @param type io-ts type to use for decoding the value.
 * @param value Value to decode using the given io-ts type.
 */
export function decode<Output, Input>(
  type: t.Decoder<Input, Output>,
  value: Input,
): Promise<Output>;
export function decode<Output, Input>(
  type: t.Decoder<Input, Output>,
  value?: Input,
): ((value: Input) => Promise<Output>) | Promise<Output> {
  switch (arguments.length) {
    case 0:
      throw new Error('Function called with no arguments');
    case 1:
      return decode.bind<
        null,
        [t.Decoder<Input, Output>],
        [Input],
        Promise<Output>
      >(null, type);
    default:
      return Either.fold<t.Errors, Output, Promise<Output>>(
        (errors) => Promise.reject(new DecodeError(errors)),
        (decodedValue) => Promise.resolve(decodedValue),
      )(type.decode(value || arguments[1]));
  }
}

/**
 * Checks whether error was produced by @see decode due to invalid data.
 */
export function isDecodeError(error: unknown): error is DecodeError {
  return error instanceof DecodeError;
}

/**
 * Custom error class which is rejected by the @see decode function
 * when decoding fails due to invalid data.
 */
export class DecodeError extends Error {
  public name = 'DecodeError';
  public errors: t.Errors;

  constructor(errors: t.Errors) {
    super(PathReporter.report(t.failures(errors)).join('\n'));
    this.errors = errors;
    Object.setPrototypeOf(this, DecodeError.prototype);
  }
}

/**
 * Creates a new io-ts type from given decode and encode functions.
 *
 * @param decode Function that transforms unknown values to desired type,
 *               or throws an error if the tranformation is not supported.
 * @param encode Function that transforms decoded values back to the original encoded format.
 * @param name Optional name of the type, making decoding errors more informative.
 */
export function createType<Output>(
  decode: (encodedValue: unknown) => Output,
  encode: (decodedValue: Output) => unknown,
  name?: string,
): t.Type<Output, unknown, unknown> {
  return extendType(t.unknown, decode, encode, name);
}

/**
 * Extends an existing io-ts type, mapping the output value using the decode and encode functions.
 *
 * @param baseType The io-ts type to extend.
 * @param decode Function to transform output of `baseType` to desired value,
 *               or throws an error if the transformation is not supported.
 * @param encode Function to transform decoded type to back to `baseType` output.
 * @param name Optional name of the type, making decoding errors more informative.
 */
export function extendType<Input, Output>(
  baseType: t.Type<Input, unknown>,
  decode: (encodedValue: Input) => Output,
  encode: (decodedValue: Output) => Input,
  name?: string,
): t.Type<Output, unknown, unknown> {
  const extendedDecoder = extendDecoder(baseType, decode);

  const typeIs: t.Is<Output> = (value: unknown): value is Output => {
    try {
      const inputValue = encode(value as any);
      if (!baseType.is(inputValue)) {
        return false;
      }
      const decodedValue = decode(inputValue);
      return deepEqual(value, decodedValue, { strict: true });
    } catch {
      return false;
    }
  };

  const typeEncode = (outputValue: Output): unknown => {
    return baseType.encode(encode(outputValue));
  };

  return new t.Type(
    name || extendedDecoder.name,
    typeIs,
    extendedDecoder.validate,
    typeEncode,
  );
}

/**
 * Creates a new decoder from decode and function.
 *
 * @param decode Function that transforms unknown values to desired type,
 *               or throws an error if the tranformation is not supported.
 * @param name Optional name of the type, making decoding errors more informative.
 */
export function createDecoder<Output>(
  decode: (value: unknown) => Output,
  name?: string,
): t.Decoder<unknown, Output> {
  return extendDecoder(t.unknown, decode, name);
}

/**
 * Extends an existing decoder, or io-ts type, mapping the output value using the decode function.
 *
 * @param baseDecoder The decoder, or io-ts type, to extend.
 * @param decode Function to transform output of `baseDecoder` to desired value,
 *               or throws an error if the transformation is not supported.
 * @param name Optional name of the type, making decoding errors more informative.
 */
export function extendDecoder<Input, Output>(
  baseDecoder: t.Decoder<unknown, Input>,
  decode: (value: Input) => Output,
  name?: string,
): t.Decoder<unknown, Output> {
  const validate: t.Validate<unknown, Output> = (
    value: unknown,
    context: t.Context,
  ) => {
    return Either.flatMap(
      baseDecoder.validate(value, context),
      (chainedValue) => {
        try {
          return t.success(decode(chainedValue));
        } catch (e) {
          if (e instanceof Error) {
            return t.failure(value, context, e.message || undefined);
          } else if (typeof e === 'string') {
            return t.failure(value, context, e);
          } else {
            return t.failure(value, context);
          }
        }
      },
    );
  };

  return new Decoder<unknown, Output>(
    name || `${baseDecoder.name}Extended`,
    validate,
  );
}

/**
 * Helper class implementing the Decoder intrface defined in io-ts.
 */
class Decoder<I, A> extends t.Type<A, unknown, I> implements t.Decoder<I, A> {
  private static is(_: unknown): _ is any {
    throw new Error('Is is not implemented in a decoder');
  }

  private static encode() {
    throw new Error('Encode is not implemented in a decoder');
  }

  constructor(name: string, validate: t.Validate<I, A>) {
    super(name, Decoder.is, validate, Decoder.encode);
  }
}
