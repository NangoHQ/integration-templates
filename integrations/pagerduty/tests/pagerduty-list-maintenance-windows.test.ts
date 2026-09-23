import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-maintenance-windows.js';

describe('pagerduty list-maintenance-windows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-maintenance-windows',
        Model: 'ActionOutput_pagerduty_listmaintenancewindows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
