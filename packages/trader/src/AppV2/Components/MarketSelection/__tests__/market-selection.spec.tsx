import { createRef } from 'react';

import { useDevice } from '@deriv-com/ui';
import { render, screen } from '@testing-library/react';

import MarketSelection from '../market-selection';

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(),
}));

jest.mock('../market-selection-desktop', () => jest.fn(() => 'MockedDesktop'));
jest.mock('../market-selection-mobile', () => jest.fn(() => 'MockedMobile'));

const mockUseDevice = useDevice as jest.Mock;

describe('MarketSelection device dispatcher', () => {
    const setIsOpen = jest.fn();
    const triggerRef = createRef<HTMLElement>();

    it('renders the desktop shell on desktop when a triggerRef is provided', () => {
        mockUseDevice.mockReturnValue({ isMobile: false });
        render(<MarketSelection isOpen setIsOpen={setIsOpen} triggerRef={triggerRef} />);
        expect(screen.getByText('MockedDesktop')).toBeInTheDocument();
    });

    it('falls back to the mobile shell on desktop when no triggerRef is provided', () => {
        mockUseDevice.mockReturnValue({ isMobile: false });
        render(<MarketSelection isOpen setIsOpen={setIsOpen} />);
        expect(screen.getByText('MockedMobile')).toBeInTheDocument();
    });

    it('renders the mobile shell on mobile', () => {
        mockUseDevice.mockReturnValue({ isMobile: true });
        render(<MarketSelection isOpen setIsOpen={setIsOpen} triggerRef={triggerRef} />);
        expect(screen.getByText('MockedMobile')).toBeInTheDocument();
    });
});
