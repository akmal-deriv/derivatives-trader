import React from 'react';

import { render, screen } from '@testing-library/react';

import BarrierDescription from '../barrier-description';

describe('BarrierDescription', () => {
    it('describes only the two signed options for relative support', () => {
        // A relative barrier is a signed offset from spot, so a fixed price is not one of its
        // options — the selector already hides it, and the description has to agree or it explains
        // a barrier type the user cannot pick on a tick/intraday duration.
        render(<BarrierDescription barrierSupport='relative' />);

        expect(screen.getByText('Above spot:')).toBeInTheDocument();
        expect(screen.getByText('Below spot:')).toBeInTheDocument();
        expect(screen.queryByText('Fixed barrier:')).not.toBeInTheDocument();
    });

    it('describes only the fixed barrier for absolute support', () => {
        render(<BarrierDescription barrierSupport='absolute' />);

        expect(screen.getByText('Fixed barrier:')).toBeInTheDocument();
        expect(screen.queryByText('Above spot:')).not.toBeInTheDocument();
        expect(screen.queryByText('Below spot:')).not.toBeInTheDocument();
    });

    it('describes the payout-derived barrier for Turbos regardless of support', () => {
        render(<BarrierDescription barrierSupport='absolute' is_turbos />);

        expect(screen.getByText(/corresponding price level based on the payout per point/)).toBeInTheDocument();
        expect(screen.queryByText('Fixed barrier:')).not.toBeInTheDocument();
    });
});
