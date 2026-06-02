import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-table-row.js';

describe('google-docs insert-table-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'insert-table-row',
        Model: 'ActionOutput_google_docs_inserttablerow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
