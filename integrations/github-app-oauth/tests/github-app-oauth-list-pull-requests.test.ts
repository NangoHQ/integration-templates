import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pull-requests.js';

describe('github-app-oauth list-pull-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pull-requests',
        Model: 'ActionOutput_github_app_oauth_listpullrequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
