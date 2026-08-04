import { getContractMarkerDirection, getContractMarkerLabel } from '../contract-marker-utils';

describe('getContractMarkerDirection', () => {
    it.each([
        ['CALL', 'up'],
        ['DIGITEVEN', 'up'],
        ['DIGITOVER', 'up'],
        ['ONETOUCH', 'up'],
        ['MULTUP', 'up'],
    ])('returns up for %s', (type, expected) => {
        expect(getContractMarkerDirection(type)).toBe(expected);
    });

    it.each([
        ['PUT', 'down'],
        ['DIGITODD', 'down'],
        ['DIGITUNDER', 'down'],
        ['NOTOUCH', 'down'],
        ['TURBOSSHORT', 'down'],
    ])('returns down for %s', (type, expected) => {
        expect(getContractMarkerDirection(type)).toBe(expected);
    });

    it('defaults to up for unknown/empty types', () => {
        expect(getContractMarkerDirection('')).toBe('up');
        expect(getContractMarkerDirection(undefined)).toBe('up');
    });
});

describe('getContractMarkerLabel', () => {
    it('returns E/O for even/odd', () => {
        expect(getContractMarkerLabel({ contract_type: 'DIGITEVEN' } as any)).toBe('E');
        expect(getContractMarkerLabel({ contract_type: 'DIGITODD' } as any)).toBe('O');
    });

    it('returns T/NT for touch/no-touch', () => {
        expect(getContractMarkerLabel({ contract_type: 'ONETOUCH' } as any)).toBe('T');
        expect(getContractMarkerLabel({ contract_type: 'NOTOUCH' } as any)).toBe('NT');
    });

    it('returns the predicted digit (barrier) for over/under and matches/differs', () => {
        expect(getContractMarkerLabel({ contract_type: 'DIGITUNDER', barrier: '7' } as any)).toBe('7');
        expect(getContractMarkerLabel({ contract_type: 'DIGITMATCH', barrier: '3' } as any)).toBe('3');
    });

    it('returns null for directional contracts (arrow is rendered instead)', () => {
        expect(getContractMarkerLabel({ contract_type: 'CALL' } as any)).toBeNull();
        expect(getContractMarkerLabel({ contract_type: 'TURBOSLONG' } as any)).toBeNull();
    });
});
