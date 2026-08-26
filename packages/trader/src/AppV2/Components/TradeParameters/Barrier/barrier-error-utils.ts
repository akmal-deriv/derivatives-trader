import { ErrorObject, mapErrorMessage } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

type TBarrierSupport = 'relative' | 'absolute';

// Rejections that mean "the value is outside the accepted band". `mapErrorMessage` only reports the
// band when the error carries its own code_args; without them it falls back to a bare "out of
// range" string, so we say which way to move instead.
const OUT_OF_RANGE_SUBCODES = new Set(['BarrierOutOfRange', 'BarrierNotInRange']);

// Rejections that carry no reason at all. Nothing can be said about *why* the value failed, so the
// message explains what the field expects instead.
const NOT_VALID_SUBCODES = new Set(['BarrierValidationError', 'InvalidBarrier', 'InvalidBarrierUndef']);

// The relative input takes a distance from spot, not a price: the sign comes from the Above/Below
// spot selector and the field itself strips `+`/`-` (`allowSign={false}`), so the copy must never
// ask the user to type one.
const getOutOfRangeMessage = (barrier_support: TBarrierSupport): string =>
    barrier_support === 'relative'
        ? localize('Your barrier is too far from the current spot. Enter a smaller distance.')
        : localize('Your barrier is too far from the current spot. Enter a price closer to it.');

const getNotValidMessage = (barrier_support: TBarrierSupport): string =>
    barrier_support === 'relative'
        ? localize("This barrier isn't valid. Enter how far you want the barrier from the current spot.")
        : localize("This barrier isn't valid. Enter the price where you want the barrier.");

/**
 * Maps a rejected-barrier proposal error to a user-facing message. Prefers, in order: the
 * range/format message `mapErrorMessage` derives from the error's own `code_args`; then, when the
 * error carries no range args, a range built from the contract's `barrier_choices` (when present)
 * instead of an unqualified rejection. When no numeric range is available from either source, it
 * replaces the bare "invalid"/"not in range" string with copy that states which way to move the
 * value and names what the field actually holds for the current barrier support type.
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

    const has_no_range_info = !has_range_args && !barrier_choices.length;
    if (has_no_range_info && error.subcode) {
        if (OUT_OF_RANGE_SUBCODES.has(error.subcode)) return getOutOfRangeMessage(barrier_support);
        if (NOT_VALID_SUBCODES.has(error.subcode)) return getNotValidMessage(barrier_support);
    }

    return mapErrorMessage(error);
};
