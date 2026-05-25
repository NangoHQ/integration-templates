import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-embedding.js';

describe('openai create-embedding tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-embedding',
        Model: 'ActionOutput_openai_createembedding'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
