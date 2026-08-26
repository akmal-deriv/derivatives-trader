import {
    getApiContractTypesForTradeType,
    getAvailableCategories,
    getAvailableTradeTypeValues,
} from '../contracts-for-utils';

jest.mock('@deriv/shared', () => ({
    cloneObject: (obj: unknown) => JSON.parse(JSON.stringify(obj)),
    getContractTypesConfig: () => ({
        rise_fall: { trade_types: ['CALL', 'PUT'], title: 'Rise/Fall', barrier_count: 0 },
        high_low: { trade_types: ['CALL', 'PUT'], title: 'Higher/Lower', barrier_count: 1 },
        multiplier: { trade_types: ['MULTUP', 'MULTDOWN'], title: 'Multipliers', barrier_count: 0 },
    }),
    getContractCategoriesConfig: () => ({
        Ups_Downs: { name: 'Ups & Downs', categories: ['rise_fall', 'high_low'] },
        Multipliers: { name: 'Multipliers', categories: ['multiplier'] },
    }),
}));

jest.mock('AppV2/Utils/trade-types-utils', () => ({
    // Return one {value} entry per category that has been transformed into an object.
    getTradeTypesList: jest.fn((categories: Record<string, { categories: Array<string | { value: string }> }>) =>
        Object.values(categories)
            .flatMap(category => category.categories)
            .filter((entry): entry is { value: string } => typeof entry === 'object')
    ),
}));

const availableContract = (contract_type: string, contract_category?: string) => ({
    contract_type,
    contract_category,
});

describe('contracts-for-utils', () => {
    describe('getAvailableCategories', () => {
        it('maps a matched contract type into a {value, text} entry within its category', () => {
            const result = getAvailableCategories({
                available: [availableContract('CALL', 'callput')],
            } as never) as Record<string, { categories: Array<string | { value: string; text: string }> }>;

            expect(result.Ups_Downs.categories).toContainEqual({ value: 'rise_fall', text: 'Rise/Fall' });
            // high_low should remain an unmatched string because contract_category was 'callput'
            expect(result.Ups_Downs.categories).toContain('high_low');
        });

        it('leaves everything untouched for an empty availability list', () => {
            const result = getAvailableCategories({ available: [] } as never) as Record<
                string,
                { categories: unknown[] }
            >;
            expect(result.Ups_Downs.categories).toEqual(['rise_fall', 'high_low']);
            expect(result.Multipliers.categories).toEqual(['multiplier']);
        });

        it('handles an undefined response gracefully', () => {
            expect(() => getAvailableCategories(undefined)).not.toThrow();
        });
    });

    describe('getAvailableTradeTypeValues', () => {
        it('returns the trade-type values a symbol supports', () => {
            const values = getAvailableTradeTypeValues({
                available: [availableContract('CALL', 'callput'), availableContract('MULTUP')],
            } as never);
            expect(values).toEqual(expect.arrayContaining(['rise_fall', 'multiplier']));
            expect(values).not.toContain('high_low');
        });

        it('returns an empty array when nothing matches', () => {
            expect(getAvailableTradeTypeValues({ available: [] } as never)).toEqual([]);
        });
    });

    describe('getApiContractTypesForTradeType', () => {
        it('maps a trade-type tab to its raw API contract-type codes', () => {
            expect(getApiContractTypesForTradeType({ for: ['multiplier'] } as never)).toEqual(['MULTUP', 'MULTDOWN']);
        });

        it('flattens and de-duplicates codes across the tab’s trade types', () => {
            // rise_fall and high_low both map to CALL/PUT in the mocked config.
            expect(getApiContractTypesForTradeType({ for: ['rise_fall', 'high_low'] } as never)).toEqual([
                'CALL',
                'PUT',
            ]);
        });

        it('ignores unknown trade-type keys', () => {
            expect(getApiContractTypesForTradeType({ for: ['does_not_exist'] } as never)).toEqual([]);
        });
    });
});
