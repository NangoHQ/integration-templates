import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-issue.js';

describe('gitlab create-issue tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-issue',
        Model: 'ActionOutput_gitlab_createissue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
