import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-values.js';

describe('google-sheet update-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-values',
        Model: 'ActionOutput_google_sheet_updatevalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
