import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-table-cells.js';

describe('google-docs merge-table-cells tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-table-cells',
        Model: 'ActionOutput_google_docs_mergetablecells'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
