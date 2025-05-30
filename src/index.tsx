import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { TextInput, TextInputProps } from 'react-native';
import { findNodeHandle } from 'react-native';
import { NativeModules, Platform } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

import type { MaskOptions } from './types';

const LINKING_ERROR =
  `The package '@alexzunik/react-native-money-input' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const ReactNativeMoneyInput = NativeModules.ReactNativeMoneyInput
  ? NativeModules.ReactNativeMoneyInput
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Apply mask to TextInput
 *
 * @param reactNode {number}
 * @param options {MaskOptions}
 */
export function applyMask(reactNode: number, options: MaskOptions) {
  ReactNativeMoneyInput.applyMask(reactNode, options);
}

/**
 * Release source for applied mask
 *
 * @param reactNode {number}
 */
export function unmount(reactNode: number) {
  ReactNativeMoneyInput.unmount(reactNode);
}

/**
 * Apply mask to any text, return promise with result
 *
 * @param reactNode {number}
 * @param options {MaskOptions}
 */
export function mask(text: string, options: MaskOptions): Promise<string> {
  return ReactNativeMoneyInput.mask(text, options);
}

/**
 * Unmask masked text, return promise with result
 *
 * @param reactNode {number}
 * @param options {MaskOptions}
 */
export function unmask(text: string, options: MaskOptions): Promise<string> {
  return ReactNativeMoneyInput.unmask(text, options);
}

export const MAX_INTEGER_DIGITS = 36;

export interface MoneyTextInputProps extends TextInputProps, MaskOptions {
  /**
   * Callback with entered value
   *
   * @param formatted {string} formatted text
   * @param extracted {string} extracted text
   */
  onChangeText: (formatted: string, extracted?: string) => void;
}

export const MoneyTextInput = forwardRef<TextInput, MoneyTextInputProps>(
  (
    {
      groupingSeparator = ' ',
      fractionSeparator,
      suffix,
      prefix,
      maximumFractionalDigits = 2,
      maximumIntegerDigits,
      minValue,
      maxValue,
      onChangeText,
      value,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);
    const [internalValue, setInternalValue] = useState<string>('');

    useImperativeHandle(ref, () => inputRef.current!);

    const maskOptions = useMemo(() => {
      if (fractionSeparator === '') {
        throw new MoneyInputError(
          'The property `fractionSeparator` cannot be an empty string'
        );
      }

      if (
        typeof minValue === 'number' &&
        typeof maxValue === 'number' &&
        minValue >= maxValue
      ) {
        throw new MoneyInputError(
          'The property `minValue` must be strictly less than `maxValue`'
        );
      }

      return {
        groupingSeparator,
        fractionSeparator,
        suffix,
        prefix,
        maximumIntegerDigits: Math.min(
          MAX_INTEGER_DIGITS,
          maximumIntegerDigits ?? MAX_INTEGER_DIGITS
        ),
        maximumFractionalDigits,
        minValue,
        maxValue,
      };
    }, [
      fractionSeparator,
      groupingSeparator,
      suffix,
      prefix,
      maximumIntegerDigits,
      maximumFractionalDigits,
      minValue,
      maxValue,
    ]);

    useEffect(() => {
      const reactNode = findNodeHandle(inputRef.current);
      if (!reactNode) {
        return;
      }
      applyMask(reactNode, maskOptions);
    }, [maskOptions]);

    useEffect(() => {
      const reactNode = findNodeHandle(inputRef.current);
      if (!reactNode) {
        return;
      }
      return () => {
        unmount(reactNode);
      };
    }, []);

    useEffect(() => {
      mask(value ?? '', maskOptions).then(setInternalValue);
    }, [value, maskOptions]);

    const changeValueHandler = useCallback(
      (text: string) => {
        setInternalValue(text);
        unmask(text, maskOptions).then((unmasked) => {
          onChangeText?.(text, unmasked);
        });
      },
      [maskOptions, onChangeText]
    );

    return (
      <BottomSheetTextInput
        ref={inputRef as any}
        keyboardType="numeric"
        {...props}
        onChangeText={changeValueHandler}
        value={internalValue}
      />
    );
  }
);

class MoneyInputError extends Error {
  constructor(msg: string) {
    super(`[MoneyInput]: ${msg}`);
  }
}
