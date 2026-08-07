import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-lead-source.js';

describe('pipelinecrm create-lead-source tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-lead-source',
        Model: 'ActionOutput_pipelinecrm_createleadsource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
