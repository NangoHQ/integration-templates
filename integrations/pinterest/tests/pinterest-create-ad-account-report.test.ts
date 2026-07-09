import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-ad-account-report.js';

describe('pinterest create-ad-account-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ad-account-report',
        Model: 'ActionOutput_pinterest_createadaccountreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
