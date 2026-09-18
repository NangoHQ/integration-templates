import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-update-incidents.js';

describe('pagerduty bulk-update-incidents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-update-incidents',
        Model: 'ActionOutput_pagerduty_bulkupdateincidents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
