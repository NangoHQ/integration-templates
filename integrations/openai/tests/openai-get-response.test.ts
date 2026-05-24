import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-response.js';

describe('openai get-response tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-response',
        Model: 'ActionOutput_openai_getresponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
