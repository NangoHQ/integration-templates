import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-incident-status-update.js';

describe('pagerduty create-incident-status-update tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-incident-status-update',
        Model: 'ActionOutput_pagerduty_createincidentstatusupdate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
