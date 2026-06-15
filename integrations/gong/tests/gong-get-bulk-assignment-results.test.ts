import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-bulk-assignment-results.js';

describe('gong-oauth get-bulk-assignment-results tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-bulk-assignment-results',
        Model: 'ActionOutput_gong_oauth_getbulkassignmentresults'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
