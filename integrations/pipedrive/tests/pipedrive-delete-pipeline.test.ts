import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-pipeline.js';

describe('pipedrive delete-pipeline tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-pipeline',
        Model: 'ActionOutput_pipedrive_deletepipeline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
