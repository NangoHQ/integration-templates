import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-range.js';

describe('microsoft-excel-oauth2-cc update-range tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-range',
        Model: 'ActionOutput_microsoft_excel_oauth2_cc_updaterange'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
