import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-work-item.js';

describe('azure-devops update-work-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-work-item',
        Model: 'ActionOutput_azure_devops_updateworkitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
