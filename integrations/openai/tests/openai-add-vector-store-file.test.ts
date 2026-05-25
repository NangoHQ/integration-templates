import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-vector-store-file.js';

describe('openai add-vector-store-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-vector-store-file',
        Model: 'ActionOutput_openai_addvectorstorefile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
