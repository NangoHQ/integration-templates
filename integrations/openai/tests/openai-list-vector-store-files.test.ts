import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vector-store-files.js';

describe('openai list-vector-store-files tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vector-store-files',
        Model: 'ActionOutput_openai_listvectorstorefiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
