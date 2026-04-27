import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-attachment.js';

describe('linear create-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-attachment',
        Model: 'ActionOutput_linear_createattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
