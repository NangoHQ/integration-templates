import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-get-values.js';

describe('google-sheet batch-get-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-get-values',
        Model: 'ActionOutput_google_sheet_batchgetvalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
