import React from 'react';

import { isDesktopOs } from '@deriv/shared';
import { useDevice } from '@deriv-com/ui';
import { render, screen } from '@testing-library/react';

import ToolbarWidgets from '../toolbar-widgets';

jest.mock('Modules/SmartChart', () => ({
    ...jest.requireActual('Modules/SmartChart'),
    ChartMode: () => <div>MockedChartMode</div>,
    DrawTools: () => <div>MockedDrawTools</div>,
    Share: () => <div>MockedShare</div>,
    StudyLegend: () => <div>MockedStudyLegend</div>,
    ToolbarWidget: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isMobile: true })),
}));

// isTabletOs is a const in @deriv/shared, so it is exposed through a getter to let each
// test choose a value. The component reads it on every render, so the getter runs lazily.
const mock_os = { isTabletOs: false };

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isDesktopOs: jest.fn(() => false),
    get isTabletOs() {
        return mock_os.isTabletOs;
    },
}));

describe('<ToolBarWidgets />', () => {
    let mocked_props: React.ComponentProps<typeof ToolbarWidgets>;
    beforeEach(() => {
        mock_os.isTabletOs = false;
        mocked_props = {
            position: 'top',
            updateChartType: jest.fn(),
            updateGranularity: jest.fn(),
        };
    });
    it('Should render only mocked chart mode and mocked draw tools when isMobile is true', () => {
        render(<ToolbarWidgets {...mocked_props} />);
        expect(screen.getByText(/mockedchartmode/i)).toBeInTheDocument();
        expect(screen.getByText(/mockeddrawtools/i)).toBeInTheDocument();
        expect(screen.queryByText(/mockedshare/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mockedstudylegend/i)).not.toBeInTheDocument();
    });
    it('Should render all mocked widgets when isDesktop is true', () => {
        (isDesktopOs as jest.Mock).mockReturnValue(true);
        (useDevice as jest.Mock).mockReturnValueOnce({ isMobile: false });
        render(<ToolbarWidgets {...mocked_props} />);
        expect(screen.getByText(/mockedchartmode/i)).toBeInTheDocument();
        expect(screen.getByText(/mockeddrawtools/i)).toBeInTheDocument();
        expect(screen.getByText(/mockedshare/i)).toBeInTheDocument();
        expect(screen.getByText(/mockedstudylegend/i)).toBeInTheDocument();
    });
    it('Should render Indicators and Share on a desktop OS that reports touch points but is not a tablet', () => {
        // Regression for issue #1122: a Linux desktop/Chromebook reporting
        // navigator.maxTouchPoints > 0 must still get the desktop-only chart tools.
        (isDesktopOs as jest.Mock).mockReturnValue(true);
        (useDevice as jest.Mock).mockReturnValueOnce({ isMobile: false });
        mock_os.isTabletOs = false;
        render(<ToolbarWidgets {...mocked_props} />);
        expect(screen.getByText(/mockedstudylegend/i)).toBeInTheDocument();
        expect(screen.getByText(/mockedshare/i)).toBeInTheDocument();
    });
    it('Should not render Indicators and Share on a real tablet', () => {
        (isDesktopOs as jest.Mock).mockReturnValue(true);
        (useDevice as jest.Mock).mockReturnValueOnce({ isMobile: false });
        mock_os.isTabletOs = true;
        render(<ToolbarWidgets {...mocked_props} />);
        expect(screen.getByText(/mockedchartmode/i)).toBeInTheDocument();
        expect(screen.getByText(/mockeddrawtools/i)).toBeInTheDocument();
        expect(screen.queryByText(/mockedstudylegend/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mockedshare/i)).not.toBeInTheDocument();
    });
});
