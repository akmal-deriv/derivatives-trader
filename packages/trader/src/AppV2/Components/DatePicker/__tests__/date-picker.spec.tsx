import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DateRangePicker from '../date-picker';

const header = 'Choose a date range';
const mockProps = {
    applyHandler: jest.fn(),
    isOpen: true,
    onClose: jest.fn(),
    setCustomTimeRangeFilter: jest.fn(),
    handleDateChange: jest.fn(),
};

describe('DateRangePicker', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should render Action Sheet with Date Picker and a header save action', () => {
        render(<DateRangePicker {...mockProps} />);

        expect(screen.getByText(header)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('should disable the header save action until a range is chosen', () => {
        render(<DateRangePicker {...mockProps} />);

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('should call onClose if user clicks on overlay', async () => {
        render(<DateRangePicker {...mockProps} />);

        await userEvent.click(screen.getByTestId('dt-actionsheet-overlay'));
        expect(mockProps.onClose).toBeCalled();
    });

    it('should not commit the range when dismissed via overlay without applying', async () => {
        render(<DateRangePicker {...mockProps} />);

        await userEvent.click(screen.getByText('1'));
        await userEvent.click(screen.getByTestId('dt-actionsheet-overlay'));

        expect(mockProps.applyHandler).not.toBeCalled();
        expect(mockProps.handleDateChange).not.toBeCalled();
    });

    it('should call setCustomTimeRangeFilter, handleDateChange and applyHandler if user choses some range date and taps the header save action', async () => {
        render(<DateRangePicker {...mockProps} />);

        const fromDate = screen.getByText('1');
        const toDate = screen.getByText('2');
        await userEvent.click(fromDate);
        await userEvent.click(toDate);

        const saveButton = screen.getByRole('button', { name: 'Save' });
        expect(saveButton).toBeEnabled();
        await userEvent.click(saveButton);

        expect(mockProps.setCustomTimeRangeFilter).toBeCalled();
        expect(mockProps.handleDateChange).toBeCalled();
        expect(mockProps.applyHandler).toBeCalled();
    });

    it('should call setCustomTimeRangeFilter, handleDateChange and applyHandler if user choses a single date and taps the header save action', async () => {
        render(<DateRangePicker {...mockProps} />);

        const fromDate = screen.getByText('1');
        await userEvent.click(fromDate);
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(mockProps.setCustomTimeRangeFilter).toBeCalled();
        expect(mockProps.handleDateChange).toBeCalled();
        expect(mockProps.applyHandler).toBeCalled();
    });
});
