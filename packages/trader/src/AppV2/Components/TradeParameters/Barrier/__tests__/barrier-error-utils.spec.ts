import { getBarrierErrorMessage } from '../barrier-error-utils';

describe('getBarrierErrorMessage', () => {
    it('returns an empty string when there is no error', () => {
        expect(getBarrierErrorMessage(undefined)).toBe('');
    });

    describe('when the error carries its own range args', () => {
        it('reports the range the API supplied rather than the support-type copy', () => {
            expect(
                getBarrierErrorMessage(
                    { subcode: 'BarrierOutOfRange', code_args: ['1.1000', '1.2000'] },
                    [],
                    'relative'
                )
            ).toBe('Barrier must be between 1.1000 and 1.2000.');
        });
    });

    describe('when the contract offers barrier_choices', () => {
        it('derives the range from the choices, quoting their sign and pip decimals back', () => {
            expect(
                getBarrierErrorMessage({ subcode: 'BarrierOutOfRange' }, ['+207.90', '-207.60', '+0.00'], 'relative')
            ).toBe('Barrier must be between -207.60 and +207.90.');
        });
    });

    // The production Touch/No Touch case: the API sends `BarrierOutOfRange` with no `code_args`,
    // and touchnotouch contracts carry no `barrier_choices`, so no numeric range exists to show.
    describe('out-of-range rejections with no range information', () => {
        it.each(['BarrierOutOfRange', 'BarrierNotInRange'])(
            'tells a relative-barrier user to shrink the distance for %s',
            subcode => {
                expect(getBarrierErrorMessage({ subcode, code_args: [] }, [], 'relative')).toBe(
                    'Your barrier is too far from the current spot. Enter a smaller distance.'
                );
            }
        );

        it.each(['BarrierOutOfRange', 'BarrierNotInRange'])(
            'tells an absolute-barrier user to move the price closer for %s',
            subcode => {
                expect(getBarrierErrorMessage({ subcode, code_args: [] }, [], 'absolute')).toBe(
                    'Your barrier is too far from the current spot. Enter a price closer to it.'
                );
            }
        );

        it('never asks the user to type a sign, which the relative input strips', () => {
            const message = getBarrierErrorMessage({ subcode: 'BarrierOutOfRange' }, [], 'relative');

            expect(message).not.toMatch(/[+-]/);
        });
    });

    describe('rejections that carry no reason', () => {
        it.each(['BarrierValidationError', 'InvalidBarrier', 'InvalidBarrierUndef'])(
            'names what the relative field expects for %s',
            subcode => {
                expect(getBarrierErrorMessage({ subcode, code_args: [] }, [], 'relative')).toBe(
                    "This barrier isn't valid. Enter how far you want the barrier from the current spot."
                );
            }
        );

        it.each(['BarrierValidationError', 'InvalidBarrier', 'InvalidBarrierUndef'])(
            'names what the absolute field expects for %s',
            subcode => {
                expect(getBarrierErrorMessage({ subcode, code_args: [] }, [], 'absolute')).toBe(
                    "This barrier isn't valid. Enter the price where you want the barrier."
                );
            }
        );

        it('still reports the decimal limit when BarrierValidationError supplies it', () => {
            expect(
                getBarrierErrorMessage({ subcode: 'BarrierValidationError', code_args: ['3'] }, [], 'relative')
            ).toBe('Barrier can only be up to 3 decimal places.');
        });
    });

    describe('subcodes outside both families', () => {
        it('passes the mapped message through unchanged', () => {
            expect(getBarrierErrorMessage({ subcode: 'BarrierNotAllowed' }, [], 'relative')).toBe(
                'Barrier is not allowed for this contract type.'
            );
        });
    });
});
