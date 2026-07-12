import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ad-account-report.js';

describe('pinterest get-ad-account-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ad-account-report',
        Model: 'ActionOutput_pinterest_getadaccountreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
