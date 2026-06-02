import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-file.js';

describe('gitlab create-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-file',
        Model: 'ActionOutput_gitlab_createfile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
