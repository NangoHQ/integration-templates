import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-lead-statuses.js';

describe('pipelinecrm list-lead-statuses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-lead-statuses',
        Model: 'ActionOutput_pipelinecrm_listleadstatuses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
