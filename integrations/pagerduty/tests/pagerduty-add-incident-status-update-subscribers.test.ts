import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-incident-status-update-subscribers.js';

describe('pagerduty add-incident-status-update-subscribers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-incident-status-update-subscribers',
        Model: 'ActionOutput_pagerduty_addincidentstatusupdatesubscribers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
