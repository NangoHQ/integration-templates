import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pipeline-runs.js';

describe('azure-devops list-pipeline-runs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pipeline-runs',
        Model: 'ActionOutput_azure_devops_listpipelineruns'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
