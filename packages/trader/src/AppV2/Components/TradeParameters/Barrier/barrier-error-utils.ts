import { ErrorObject, mapErrorMessage } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

type TBarrierSupport = 'relative' | 'absolute';

// Subcodes where mapErrorMessage falls back to a bare "not valid"/"not in range" string once its
// own code_args are absent — these are the ones that need the format/sign hint appended below.
const BARE_FALLBACK_SUBCODES = new Set([
    'BarrierNotInRange',
    'BarrierOutOfRange',
    'BarrierValidationError',
    'InvalidBarrier',
    'InvalidBarrierUndef',
]);

const getBarrierFormatHint = (barrier_support: TBarrierSupport): string =>
    barrier_support === 'relative'
        ? localize('Enter a distance from the current spot, starting with + (above spot) or - (below spot).')
        : localize('Enter the barrier as an absolute price.');

/**
 * Maps a rejected-barrier proposal error to a user-facing message. Prefers, in order: the
 * range/format message `mapErrorMessage` derives from the error's own `code_args`; then, when the
 * error carries no range args, a hint built from the contract's `barrier_choices` (when present)
 * instead of an unqualified rejection. When neither numeric range is available, the message names
 * the expected format/sign for the current barrier support type rather than leaving the user with
 * a bare "invalid"/"not in range" string.
 */
export const getBarrierErrorMessage = (
    error: ErrorObject | undefined,
    barrier_choices: string[] = [],
    barrier_support: TBarrierSupport = 'absolute'
): string => {
    if (!error) return '';

    const has_range_args = Array.isArray(error.code_args) && error.code_args.length > 0;
    if (!has_range_args && barrier_choices.length) {
        // Compare numerically but quote the original strings back: the API's choices carry the
        // sign convention and pip decimals the user is expected to type (e.g. `+207.90`,
        // `-207.60`), and reformatting them through Number drops both.
        const choices = barrier_choices
            .map(choice => ({ label: choice, value: Number(choice) }))
            .filter(choice => !isNaN(choice.value));

        if (choices.length) {
            const min = choices.reduce((lowest, choice) => (choice.value < lowest.value ? choice : lowest));
            const max = choices.reduce((highest, choice) => (choice.value > highest.value ? choice : highest));
            return localize('Barrier must be between {{min}} and {{max}}.', { min: min.label, max: max.label });
        }
    }

    const mapped_message = mapErrorMessage(error);

    const has_no_range_info = !has_range_args && !barrier_choices.length;
    if (has_no_range_info && error.subcode && BARE_FALLBACK_SUBCODES.has(error.subcode)) {
        return `${mapped_message} ${getBarrierFormatHint(barrier_support)}`;
    }

    return mapped_message;
};
