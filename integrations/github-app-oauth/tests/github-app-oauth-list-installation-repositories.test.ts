import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-installation-repositories.js';

describe('github-app-oauth list-installation-repositories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-installation-repositories',
        Model: 'ActionOutput_github_app_oauth_listinstallationrepositories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
