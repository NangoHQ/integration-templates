import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-personal-access-tokens.js';

describe('datadog list-personal-access-tokens tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-personal-access-tokens',
        Model: 'ActionOutput_datadog_listpersonalaccesstokens'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
