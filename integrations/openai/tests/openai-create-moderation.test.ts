import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-moderation.js';

describe('openai create-moderation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-moderation',
        Model: 'ActionOutput_openai_createmoderation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
