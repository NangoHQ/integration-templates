import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-workbook.js';

describe('microsoft-excel-oauth2-cc create-workbook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-workbook',
        Model: 'ActionOutput_microsoft_excel_oauth2_cc_createworkbook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
