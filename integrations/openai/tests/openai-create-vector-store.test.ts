import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-vector-store.js';

describe('openai create-vector-store tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-vector-store',
        Model: 'ActionOutput_openai_createvectorstore'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
