import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CONTRACT_LIST } from 'AppV2/Utils/trade-types-utils';

import VideoPreview from '../video-preview';

const mock_props = { contract_type: CONTRACT_LIST.ACCUMULATORS, toggleVideoPlayer: jest.fn(), video_src: '' };

let mock_is_mobile = true;

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: () => ({ isMobile: mock_is_mobile }),
}));

jest.mock('@deriv/components', () => ({
    VideoPlayer: () => <div data-testid='dt_video_player_component' />,
}));

jest.mock('AppV2/Utils/video-config', () => ({
    getVideoMp4Url: (src: string) => src,
    getVideoThumbnailUrl: (src: string) => src,
}));

describe('VideoPreview', () => {
    describe('mobile', () => {
        beforeEach(() => {
            mock_is_mobile = true;
        });

        it('should render component', () => {
            render(<VideoPreview {...mock_props} />);
            expect(screen.getByText(/Watch this video to learn about this trade type/i)).toBeInTheDocument();
        });
    });

    describe('desktop', () => {
        beforeEach(() => {
            mock_is_mobile = false;
        });

        it('should render thumbnail preview with play button', () => {
            render(<VideoPreview {...mock_props} />);
            expect(screen.getByTestId('dt_video_preview')).toBeInTheDocument();
        });

        it('should switch to video player when play button is clicked', async () => {
            render(<VideoPreview {...mock_props} />);
            await userEvent.click(screen.getByTestId('dt_video_preview'));
            expect(screen.getByTestId('dt_video_player')).toBeInTheDocument();
        });
    });
});
