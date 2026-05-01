import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-pull-request.js';

describe('github-app-oauth merge-pull-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-pull-request',
        Model: 'ActionOutput_github_app_oauth_mergepullrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
