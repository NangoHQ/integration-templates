import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-identity-providers.js';

describe('datadog list-user-identity-providers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-identity-providers',
        Model: 'ActionOutput_datadog_listuseridentityproviders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
