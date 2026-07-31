import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-sites.js';

describe('microsoft-excel-oauth2-cc list-sites tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-sites',
        Model: 'ActionOutput_microsoft_excel_oauth2_cc_listsites'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
