import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-requisitions.js';

describe('workday-refresh-token list-job-requisitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-requisitions',
        Model: 'ActionOutput_workday_refresh_token_listjobrequisitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
