import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-batches.js';

describe('openai list-batches tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-batches',
        Model: 'ActionOutput_openai_listbatches'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
