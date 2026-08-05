import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-lead-sources.js';

describe('pipelinecrm list-lead-sources tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-lead-sources',
        Model: 'ActionOutput_pipelinecrm_listleadsources'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
