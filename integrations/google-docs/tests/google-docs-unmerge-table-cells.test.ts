import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unmerge-table-cells.js';

describe('google-docs unmerge-table-cells tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unmerge-table-cells',
        Model: 'ActionOutput_google_docs_unmergetablecells'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
