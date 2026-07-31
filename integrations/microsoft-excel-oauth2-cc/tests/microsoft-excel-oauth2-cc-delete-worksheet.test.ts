import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-worksheet.js';

describe('microsoft-excel-oauth2-cc delete-worksheet tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-worksheet',
        Model: 'ActionOutput_microsoft_excel_oauth2_cc_deleteworksheet'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
