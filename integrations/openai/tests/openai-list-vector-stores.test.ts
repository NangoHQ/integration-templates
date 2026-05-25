import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vector-stores.js';

describe('openai list-vector-stores tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vector-stores',
        Model: 'ActionOutput_openai_listvectorstores'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
