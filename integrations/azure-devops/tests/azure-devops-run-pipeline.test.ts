import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/run-pipeline.js';

describe('azure-devops run-pipeline tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'run-pipeline',
        Model: 'ActionOutput_azure_devops_runpipeline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
