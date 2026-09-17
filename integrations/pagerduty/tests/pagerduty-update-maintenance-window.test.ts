import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-maintenance-window.js';

describe('pagerduty update-maintenance-window tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-maintenance-window',
        Model: 'ActionOutput_pagerduty_updatemaintenancewindow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
