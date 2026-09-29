import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-pages-site.js';

describe('github-app-oauth create-pages-site tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-pages-site',
        Model: 'ActionOutput_github_app_oauth_createpagessite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
