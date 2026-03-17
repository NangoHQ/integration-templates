import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-worksheet.js';

describe('google-sheet delete-worksheet tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-worksheet',
        Model: 'ActionOutput_google_sheet_deleteworksheet'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
