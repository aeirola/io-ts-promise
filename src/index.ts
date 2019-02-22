import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

/**
 *
 * @param type
 */
export function decode<Output>(
  type: t.Decoder<unknown, Output>
): (value: unknown) => Promise<Output>;
/**
 *
 * @param type
 * @param value
 */
export function decode<Output>(
  type: t.Decoder<unknown, Output>,
  value: unknown
): Promise<Output>;
export function decode<Output>(
  type: t.Decoder<unknown, Output>,
  value?: unknown
): ((value: unknown) => Promise<Output>) | Promise<Output> {
  switch (arguments.length) {
    case 0:
      throw new Error('Function called with no arguments');
    case 1:
      return decode.bind<
        null,
        t.Decoder<unknown, Output>,
        [unknown],
        Promise<Output>
      >(null, type);
    default:
      const result = type.decode(value);
      return result.fold(
        () => Promise.reject(new Error(PathReporter.report(result).join('\n'))),
        decodedValue => Promise.resolve(decodedValue)
      );
  }
}

/**
 *
 * @param decode
 * @param encode
 * @param name
 */
export function createType<Output>(
  decode: (encodedValue: unknown) => Output,
  encode: (decodedValue: Output) => unknown,
  name?: string
) {
  return extendType(t.unknown, decode, encode, name);
}

/**
 *
 * @param baseType
 * @param decode
 * @param encode
 * @param name
 */
export function extendType<Input, Output>(
  baseType: t.Type<Input>,
  decode: (encodedValue: Input) => Output,
  encode: (decodedValue: Output) => Input,
  name?: string
): t.Type<Output, unknown, unknown> {
  const typeName = name || 'UnnamedType';
  const typeIs: t.Is<Output> = (value: unknown): value is Output => {
    try {
      const inputValue = encode(value as any);
      if (!baseType.is(inputValue)) {
        return false;
      }
      decode(inputValue);
      return true;
    } catch {
      return false;
    }
  };

  const typeValidate: t.Validate<unknown, Output> = (
    value: unknown,
    context: t.Context
  ) => {
    return baseType.validate(value, context).chain(inputValue => {
      try {
        return t.success(decode(inputValue));
      } catch (error) {
        return t.failure(value, context, error);
      }
    });
  };

  const typeEncode = (outputValue: Output) => {
    return baseType.encode(encode(outputValue));
  };

  return new t.Type(typeName, typeIs, typeValidate, typeEncode);
}

class Decoder<Output> extends t.Type<Output, unknown, unknown>
  implements t.Decoder<unknown, Output> {
  private static is(_: unknown): _ is any {
    throw new Error('Is is not implemented in a decoder');
  }

  private static encode() {
    throw new Error('Encode is not implemented in a decoder');
  }

  constructor(name: string, validate: t.Validate<unknown, Output>) {
    super(name, Decoder.is, validate, Decoder.encode);
  }
}

/**
 *
 * @param decode
 * @param name
 */
export function createDecoder<Output>(
  decode: (value: unknown) => Output,
  name?: string
): t.Decoder<unknown, Output> {
  const validate: t.Validate<unknown, Output> = (
    value: unknown,
    context: t.Context
  ) => {
    try {
      return t.success(decode(value));
    } catch (e) {
      return t.failure(value, context, e);
    }
  };

  return new Decoder<Output>(name || 'UnnamedDecoder', validate);
}

/**
 *
 * @param baseDecoder
 * @param decode
 * @param name
 */
export function extendDecoder<Input, Output>(
  baseDecoder: t.Decoder<unknown, Input>,
  decode: (value: Input) => Output,
  name?: string
): t.Decoder<unknown, Output> {
  const validate: t.Validate<unknown, Output> = (
    value: unknown,
    context: t.Context
  ) => {
    return baseDecoder.validate(value, context).chain(chainedValue => {
      try {
        return t.success(decode(chainedValue));
      } catch (e) {
        return t.failure(value, context, e);
      }
    });
  };

  return new Decoder<Output>(name || baseDecoder.name, validate);
}
