import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-file-contents.js';

describe('github-app-oauth get-file-contents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-file-contents',
        Model: 'ActionOutput_github_app_oauth_getfilecontents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
