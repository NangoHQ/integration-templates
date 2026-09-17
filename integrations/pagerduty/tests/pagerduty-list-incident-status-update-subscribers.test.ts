import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-incident-status-update-subscribers.js';

describe('pagerduty list-incident-status-update-subscribers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-incident-status-update-subscribers',
        Model: 'ActionOutput_pagerduty_listincidentstatusupdatesubscribers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
