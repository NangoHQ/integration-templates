import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-log-entry.js';

describe('pagerduty get-log-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-log-entry',
        Model: 'ActionOutput_pagerduty_getlogentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
