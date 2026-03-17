import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-column.js';

describe('google-sheet create-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-column',
        Model: 'ActionOutput_google_sheet_createcolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
