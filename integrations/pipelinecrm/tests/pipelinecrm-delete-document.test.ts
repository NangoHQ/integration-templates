import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-document.js';

describe('pipelinecrm delete-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-document',
        Model: 'ActionOutput_pipelinecrm_deletedocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
