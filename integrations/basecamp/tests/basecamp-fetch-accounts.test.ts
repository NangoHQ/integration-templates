import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-accounts.js';

describe('basecamp fetch-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-accounts',
        Model: 'ActionOutput_basecamp_fetchaccounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
