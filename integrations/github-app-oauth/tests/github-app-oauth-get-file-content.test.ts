import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-file-content.js';

describe('github-app-oauth get-file-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-file-content',
        Model: 'ActionOutput_github_app_oauth_getfilecontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
