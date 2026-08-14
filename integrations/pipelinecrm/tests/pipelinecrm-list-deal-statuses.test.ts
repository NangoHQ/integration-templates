import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deal-statuses.js';

describe('pipelinecrm list-deal-statuses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deal-statuses',
        Model: 'ActionOutput_pipelinecrm_listdealstatuses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
