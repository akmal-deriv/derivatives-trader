import React from 'react';

import { useIsRtl } from '@deriv/api';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import VideoPlayer from '../video-player';

jest.mock('@deriv/api', () => ({
    useIsRtl: jest.fn(() => false),
}));
jest.mock('@deriv/quill-icons', () => ({
    StandalonePlayFillIcon: () => <div>IcPlay</div>,
    StandalonePauseFillIcon: () => <div>IcPause</div>,
    StandaloneArrowRotateRightRegularIcon: () => <div>IcReplay</div>,
    StandaloneVolumeHighRegularIcon: () => <div>IcVolumeHigh</div>,
    StandaloneVolumeXmarkRegularIcon: () => <div>IcVolumeXmark</div>,
    StandalonePlaybackSpeedFillIcon: () => <div>IcPlaybackSpeed</div>,
    LegacyChevronLeft1pxIcon: () => <div>IcChevronLeft</div>,
    LegacyChevronDown1pxIcon: () => <div>IcChevronDown</div>,
}));

const default_playback_rate = 'Normal';
const player_data_testid = 'dt_video_player';
const video_data_testid = 'dt_video_player-video';
const icon_play = 'IcPlay';
const icon_pause = 'IcPause';
const icon_replay = 'IcReplay';
const faster_playback_rate = '1.5x';

const mocked_props: React.ComponentProps<typeof VideoPlayer> = {
    data_testid: player_data_testid,
    src: 'test_src',
};

describe('<VideoPlayer />', () => {
    const original_user_agent = window.navigator.userAgent;

    beforeAll(() => {
        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            configurable: true,
        });
        Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
            get() {
                return 50;
            },
            configurable: true,
        });
        Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
            get() {
                return 0;
            },
            set() {
                // noop: JSDOM rejects NaN from getBoundingClientRect layout-less calculations
            },
            configurable: true,
        });
        window.HTMLMediaElement.prototype.play = () => Promise.resolve();
        window.HTMLMediaElement.prototype.pause = () => undefined;
    });

    afterAll(() => {
        Object.defineProperty(window.navigator, 'userAgent', {
            value: original_user_agent,
            configurable: true,
        });
    });

    it('should render the component on desktop', async () => {
        render(<VideoPlayer {...mocked_props} />);
        const video = screen.getByTestId(video_data_testid);
        fireEvent.loadedMetadata(video);
        expect(screen.getByTestId(player_data_testid)).toBeInTheDocument();

        const playback_rate = screen.getByText(default_playback_rate);
        await userEvent.click(playback_rate);
        const new_playback_rate = screen.getByText(faster_playback_rate);
        await userEvent.click(new_playback_rate);
        expect(screen.getAllByText(faster_playback_rate)).toHaveLength(2);

        const pause_button = screen.getByText(icon_pause);
        await userEvent.click(pause_button);
        expect(screen.queryByText(icon_pause)).not.toBeInTheDocument();
        expect(screen.getByText(icon_play)).toBeInTheDocument();

        const player_progress_bar = screen.getByTestId('dt_progress_bar');
        expect(player_progress_bar).toBeInTheDocument();
        await userEvent.click(player_progress_bar);
        expect(screen.getByText(icon_play)).toBeInTheDocument();
    });
    it('should render the component for mobile browsers except for Safari', async () => {
        render(<VideoPlayer {...mocked_props} is_mobile />);
        const video = screen.getByTestId(video_data_testid);
        fireEvent.loadedMetadata(video);
        expect(screen.getByTestId(player_data_testid)).toBeInTheDocument();

        const pause_button = screen.getByText(icon_pause);
        await userEvent.click(pause_button);
        expect(screen.queryByText(icon_pause)).not.toBeInTheDocument();
        expect(screen.getByText(icon_play)).toBeInTheDocument();
    });
    it('should render the component on mobile for Safari and autoplay when autoplay=true', () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
            configurable: true,
        });
        render(<VideoPlayer {...mocked_props} is_mobile />);
        const video = screen.getByTestId(video_data_testid);
        fireEvent.loadedMetadata(video);
        expect(screen.getByTestId(player_data_testid)).toBeInTheDocument();

        // autoplay=true (default) — video plays via imperative .play() even on iOS Safari
        const pause_button = screen.getByText(icon_pause);
        expect(pause_button).toBeInTheDocument();
    });
    it('should not resume playing if user taps upon replay overlay while the video is not ended', async () => {
        render(<VideoPlayer {...mocked_props} />);
        const video = screen.getByTestId(video_data_testid);
        fireEvent.loadedMetadata(video);
        fireEvent(video, new Event('ended'));
        expect(screen.getByText(icon_play)).toBeInTheDocument();

        const replay_button = screen.getByText(icon_replay);
        expect(replay_button).toBeInTheDocument();
        await userEvent.click(replay_button);
        expect(screen.getByText(icon_play)).toBeInTheDocument();
    });
    it('should render progress bar correctly in RTL mode without reversing direction', () => {
        (useIsRtl as jest.Mock).mockReturnValue(true);

        render(<VideoPlayer {...mocked_props} />);
        const video = screen.getByTestId(video_data_testid);
        fireEvent.loadedMetadata(video);

        expect(screen.getByTestId(player_data_testid)).toBeInTheDocument();

        const progress_bar = screen.getByTestId('dt_progress_bar');
        expect(progress_bar).toBeInTheDocument();

        const progress_bar_filled = screen.getByTestId('dt_progress_bar_filled');
        expect(progress_bar_filled).toBeInTheDocument();

        (useIsRtl as jest.Mock).mockReturnValue(false);
    });
});
