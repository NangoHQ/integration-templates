import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-response.js';

describe('openai create-response tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-response',
        Model: 'ActionOutput_openai_createresponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
