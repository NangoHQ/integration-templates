import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-release-assets.js';

describe('github-app-oauth list-release-assets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-release-assets',
        Model: 'ActionOutput_github_app_oauth_listreleaseassets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
