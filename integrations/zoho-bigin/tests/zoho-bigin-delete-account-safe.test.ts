import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-account-safe.js';

describe('zoho-bigin delete-account-safe tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-account-safe',
        Model: 'ActionOutput_zoho_bigin_deleteaccountsafe'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
