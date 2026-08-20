import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import ActionSheetHeaderTooltip from '../action-sheet-header-tooltip';
import { ActionSheetHeaderTitle } from '..';

describe('ActionSheetHeaderTooltip', () => {
    it('renders nothing when no description is passed', () => {
        const { container } = render(<ActionSheetHeaderTooltip />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders an icon-only button with the default accessible name', () => {
        render(<ActionSheetHeaderTooltip description='Some definition' />);
        expect(screen.getByRole('button', { name: 'More info' })).toBeInTheDocument();
    });

    it('uses the provided label as the accessible name', () => {
        render(<ActionSheetHeaderTooltip description='Some definition' label='Barrier' />);
        expect(screen.getByRole('button', { name: 'Barrier' })).toBeInTheDocument();
    });

    it('reveals the description on hover/tap and does not commit anything', () => {
        render(<ActionSheetHeaderTooltip description='Barrier set at specific price.' label='Barrier' />);
        const trigger = screen.getByRole('button', { name: 'Barrier' });

        expect(screen.queryByText('Barrier set at specific price.')).not.toBeInTheDocument();
        fireEvent.mouseEnter(trigger);
        expect(screen.getByText('Barrier set at specific price.')).toBeInTheDocument();
    });

    it('composes a title with a trailing info tooltip via ActionSheetHeaderTitle', () => {
        render(<ActionSheetHeaderTitle title='Barrier' description='A definition' label='Barrier' />);
        expect(screen.getByText('Barrier')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Barrier' })).toBeInTheDocument();
    });
});
