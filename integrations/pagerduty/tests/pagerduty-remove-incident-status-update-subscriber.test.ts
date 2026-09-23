import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-incident-status-update-subscriber.js';

describe('pagerduty remove-incident-status-update-subscriber tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-incident-status-update-subscriber',
        Model: 'ActionOutput_pagerduty_removeincidentstatusupdatesubscriber'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
