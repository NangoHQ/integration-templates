import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-account-information.js';

describe('hubspot fetch-account-information tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-account-information',
        Model: 'ActionOutput_hubspot_fetchaccountinformation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
