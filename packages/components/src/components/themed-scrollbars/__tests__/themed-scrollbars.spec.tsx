import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ThemedScrollbars from '../themed-scrollbars';

/**
 * Characterization tests for the ThemedScrollbars class-name contract.
 * These pin existing class wiring that SCSS Firefox rules (autohide / hidden)
 * depend on; they do not go red against current unfixed TSX (no prop changes).
 */
describe('ThemedScrollbars', () => {
    const test_id = 'dt_themed_scrollbars';

    it('should render with base and default autohide classes', () => {
        render(
            <ThemedScrollbars>
                <div>content</div>
            </ThemedScrollbars>
        );

        const root = screen.getByTestId(test_id);
        expect(root).toHaveClass('dc-themed-scrollbars');
        expect(root).toHaveClass('dc-themed-scrollbars__autohide');
    });

    it('should not add autohide class when autohide is false', () => {
        render(
            <ThemedScrollbars autohide={false}>
                <div>content</div>
            </ThemedScrollbars>
        );

        const root = screen.getByTestId(test_id);
        expect(root).toHaveClass('dc-themed-scrollbars');
        expect(root).not.toHaveClass('dc-themed-scrollbars__autohide');
    });

    it('should add hidden-scrollbar class when is_scrollbar_hidden is true', () => {
        render(
            <ThemedScrollbars is_scrollbar_hidden>
                <div>content</div>
            </ThemedScrollbars>
        );

        expect(screen.getByTestId(test_id)).toHaveClass('dc-themed-scrollbars--hidden-scrollbar');
    });

    it('should render children without the scrollbar wrapper when is_bypassed', () => {
        render(
            <ThemedScrollbars is_bypassed>
                <div data-testid='bypassed_child'>content</div>
            </ThemedScrollbars>
        );

        expect(screen.queryByTestId(test_id)).not.toBeInTheDocument();
        expect(screen.getByTestId('bypassed_child')).toBeInTheDocument();
    });

    it('should add is-hovered class on mouseover when autohide is enabled', () => {
        render(
            <ThemedScrollbars>
                <div>content</div>
            </ThemedScrollbars>
        );

        const root = screen.getByTestId(test_id);
        expect(root).not.toHaveClass('dc-themed-scrollbars__autohide--is-hovered');

        fireEvent.mouseOver(root);

        expect(root).toHaveClass('dc-themed-scrollbars__autohide--is-hovered');
    });
});
