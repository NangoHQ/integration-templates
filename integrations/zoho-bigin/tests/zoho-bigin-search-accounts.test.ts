import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-accounts.js';

describe('zoho-bigin search-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-accounts',
        Model: 'ActionOutput_zoho_bigin_searchaccounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
