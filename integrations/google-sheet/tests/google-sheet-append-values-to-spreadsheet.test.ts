import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/append-values-to-spreadsheet.js';

describe('google-sheet append-values-to-spreadsheet tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'append-values-to-spreadsheet',
        Model: 'ActionOutput_google_sheet_appendvaluestospreadsheet'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
