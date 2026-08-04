import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-api-tokens.js';

describe('dynatrace list-api-tokens tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-api-tokens',
        Model: 'ActionOutput_dynatrace_listapitokens'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
