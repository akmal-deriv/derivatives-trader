import React, { useMemo } from 'react';

import { localize } from '@deriv-com/translations';

import type { VerticalTabItem } from '../../InputPopover/vertical-tab-selector';
import VerticalTabSelector from '../../InputPopover/vertical-tab-selector';

interface BarrierTypeSelectorProps {
    selectedType: string;
    onSelectType: (type: string) => void;
    className?: string;
    support?: 'relative' | 'absolute';
}

const BarrierTypeSelector: React.FC<BarrierTypeSelectorProps> = ({
    selectedType,
    onSelectType,
    className,
    support = 'relative',
}) => {
    // Relative barriers are a signed offset from spot, so only the two sign options apply; the
    // fixed-price option shows only when the API default for this contract type + duration is
    // an absolute price.
    const BARRIER_TYPES: VerticalTabItem[] = useMemo(
        () =>
            support === 'relative'
                ? [
                      { value: 'above_spot', label: localize('Above spot') },
                      { value: 'below_spot', label: localize('Below spot') },
                  ]
                : [{ value: 'fixed_barrier', label: localize('Fixed barrier') }],
        [support]
    );

    return (
        <VerticalTabSelector
            items={BARRIER_TYPES}
            selectedValue={selectedType}
            onSelect={onSelectType}
            className={className}
        />
    );
};

export default BarrierTypeSelector;
