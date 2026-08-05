import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-lead-source.js';

describe('pipelinecrm delete-lead-source tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-lead-source',
        Model: 'ActionOutput_pipelinecrm_deleteleadsource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
