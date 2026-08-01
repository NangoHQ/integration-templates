import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/calculate-workbook.js';

describe('microsoft-excel-oauth2-cc calculate-workbook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'calculate-workbook',
        Model: 'ActionOutput_microsoft_excel_oauth2_cc_calculateworkbook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
