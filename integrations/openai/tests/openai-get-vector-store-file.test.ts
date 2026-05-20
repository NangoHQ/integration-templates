import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-vector-store-file.js';

describe('openai get-vector-store-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-vector-store-file',
        Model: 'ActionOutput_openai_getvectorstorefile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
