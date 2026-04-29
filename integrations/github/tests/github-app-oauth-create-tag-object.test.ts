import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-tag-object.js';

describe('github-app-oauth create-tag-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-tag-object',
        Model: 'ActionOutput_github_app_oauth_createtagobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
