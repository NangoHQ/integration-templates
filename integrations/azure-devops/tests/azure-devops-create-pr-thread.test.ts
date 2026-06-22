import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-pr-thread.js';

describe('azure-devops create-pr-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-pr-thread',
        Model: 'ActionOutput_azure_devops_createprthread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
