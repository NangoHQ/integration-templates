import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/clear-values.js';

describe('google-sheet clear-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'clear-values',
        Model: 'ActionOutput_google_sheet_clearvalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
