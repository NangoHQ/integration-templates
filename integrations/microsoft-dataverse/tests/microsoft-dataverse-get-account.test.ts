import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-account.js';

describe('microsoft-dataverse get-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-account',
        Model: 'ActionOutput_microsoft_dataverse_getaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
