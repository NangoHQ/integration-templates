import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-update-incident-alerts.js';

describe('pagerduty bulk-update-incident-alerts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-update-incident-alerts',
        Model: 'ActionOutput_pagerduty_bulkupdateincidentalerts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
