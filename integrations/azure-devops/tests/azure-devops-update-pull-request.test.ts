import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-pull-request.js';

describe('azure-devops update-pull-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-pull-request',
        Model: 'ActionOutput_azure_devops_updatepullrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
