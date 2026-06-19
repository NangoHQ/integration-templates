import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-work-item.js';

describe('azure-devops delete-work-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-work-item',
        Model: 'ActionOutput_azure_devops_deleteworkitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
