import React from 'react';

/**
 * Quill's `TextField` with `allowDecimals` accepts unlimited decimals by
 * default and rounds extras via `toFixed()`, which silently increments the
 * value (e.g. typing "5" after `5.34` yields `5.35`). The Stake input
 * works around this with a `onBeforeInput` guard that blocks the keystroke
 * before the input updates. The two helpers in this file extract that
 * logic so any decimal-bounded automation field can reuse it.
 */

/**
 * Max character length for a decimal input. With a separator present, allow
 * 10 integer digits + the separator + N decimals; otherwise just the 10
 * integer digits. Mirrors the Stake input's calculation.
 */
export const getDecimalInputMaxLength = (value: string | number, decimals: number): number => {
    const str = String(value);
    const has_separator = str.includes('.') || str.includes(',');
    return has_separator ? 11 + decimals : 10;
};

/**
 * Returns an `onBeforeInput` handler that prevents typing digits past the
 * given decimal limit. Pass `decimals: 0` to skip enforcement (the handler
 * becomes a no-op).
 */
export const createDecimalInputGuard = (decimals: number) => (e: React.FormEvent<HTMLInputElement>) => {
    const typed_char = (e.nativeEvent as InputEvent)?.data ?? '';
    if (!typed_char || !/\d/.test(typed_char) || decimals <= 0) return;
    const input = e.target as HTMLInputElement;
    const separator_index = input.value.search(/[.,]/);
    const cursor_pos = input.selectionStart ?? input.value.length;
    if (
        separator_index !== -1 &&
        input.value.length - separator_index - 1 >= decimals &&
        cursor_pos > separator_index
    ) {
        e.preventDefault();
    }
};
