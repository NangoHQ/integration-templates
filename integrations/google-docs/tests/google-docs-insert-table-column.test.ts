import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-table-column.js';

describe('google-docs insert-table-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'insert-table-column',
        Model: 'ActionOutput_google_docs_inserttablecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
