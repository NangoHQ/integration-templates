import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/pin-table-header-rows.js';

describe('google-docs pin-table-header-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'pin-table-header-rows',
        Model: 'ActionOutput_google_docs_pintableheaderrows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
