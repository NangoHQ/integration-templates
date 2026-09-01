import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-job-requisition.js';

describe('workday-refresh-token get-job-requisition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-job-requisition',
        Model: 'ActionOutput_workday_refresh_token_getjobrequisition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
