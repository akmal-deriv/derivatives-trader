import { configure } from 'mobx';

import UIStore from '../ui-store';

configure({ safeDescriptors: false });

describe('UIStore.toggleUrlUnavailableModal', () => {
    let ui: InstanceType<typeof UIStore>;

    beforeEach(() => {
        // ui-store is plain JS; only the root_store members its constructor touches are needed here.
        ui = new UIStore({ common: {}, client: {} } as never);
    });

    it('defaults to the trade-type reason when none is passed', () => {
        ui.toggleUrlUnavailableModal(true);
        expect(ui.isUrlUnavailableModalVisible).toBe(true);
        expect(ui.urlUnavailableModalReason).toBe('trade_type');
    });

    it('stores the reason it was opened with', () => {
        ui.toggleUrlUnavailableModal(true, 'symbol');
        expect(ui.urlUnavailableModalReason).toBe('symbol');
    });

    it('keeps the last reason when closed so a re-open is not mislabelled', () => {
        ui.toggleUrlUnavailableModal(true, 'symbol');
        ui.toggleUrlUnavailableModal(false);
        expect(ui.isUrlUnavailableModalVisible).toBe(false);
        expect(ui.urlUnavailableModalReason).toBe('symbol');
    });

    it('widens to "both" instead of rewriting the title when a second reason arrives while open', () => {
        // GRWT-9320: a second validation reporting a different invalid URL value used to replace the
        // reason, flipping "Unsupported trade type" to "Unsupported market" under the user's eyes.
        ui.toggleUrlUnavailableModal(true, 'trade_type');
        ui.toggleUrlUnavailableModal(true, 'symbol');
        expect(ui.isUrlUnavailableModalVisible).toBe(true);
        expect(ui.urlUnavailableModalReason).toBe('both');
    });

    it('is idempotent when the same reason is reported twice', () => {
        ui.toggleUrlUnavailableModal(true, 'symbol');
        ui.toggleUrlUnavailableModal(true, 'symbol');
        expect(ui.urlUnavailableModalReason).toBe('symbol');
    });
});
