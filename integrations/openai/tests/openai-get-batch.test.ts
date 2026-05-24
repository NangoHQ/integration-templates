import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-batch.js';

describe('openai get-batch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-batch',
        Model: 'ActionOutput_openai_getbatch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
