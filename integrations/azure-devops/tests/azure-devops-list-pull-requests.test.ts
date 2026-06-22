import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pull-requests.js';

describe('azure-devops list-pull-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pull-requests',
        Model: 'ActionOutput_azure_devops_listpullrequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
