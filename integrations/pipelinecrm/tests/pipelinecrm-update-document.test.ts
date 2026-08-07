import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-document.js';

describe('pipelinecrm update-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-document',
        Model: 'ActionOutput_pipelinecrm_updatedocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
