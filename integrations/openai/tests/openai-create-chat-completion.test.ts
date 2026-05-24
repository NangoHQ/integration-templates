import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-chat-completion.js';

describe('openai create-chat-completion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-chat-completion',
        Model: 'ActionOutput_openai_createchatcompletion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
