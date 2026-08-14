import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-commit-statuses.js';

describe('github-app-oauth list-commit-statuses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-commit-statuses',
        Model: 'ActionOutput_github_app_oauth_listcommitstatuses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
