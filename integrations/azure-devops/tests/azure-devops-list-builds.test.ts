import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-builds.js';

describe('azure-devops list-builds tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-builds',
        Model: 'ActionOutput_azure_devops_listbuilds'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
