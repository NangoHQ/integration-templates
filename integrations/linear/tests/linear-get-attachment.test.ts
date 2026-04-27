import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-attachment.js';

describe('linear get-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-attachment',
        Model: 'ActionOutput_linear_getattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
