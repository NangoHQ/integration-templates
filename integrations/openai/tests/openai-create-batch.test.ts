import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-batch.js';

describe('openai create-batch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-batch',
        Model: 'ActionOutput_openai_createbatch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
