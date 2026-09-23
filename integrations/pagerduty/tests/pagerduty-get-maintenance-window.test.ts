import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-maintenance-window.js';

describe('pagerduty get-maintenance-window tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-maintenance-window',
        Model: 'ActionOutput_pagerduty_getmaintenancewindow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
