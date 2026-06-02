import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-table-column-properties.js';

describe('google-docs update-table-column-properties tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-table-column-properties',
        Model: 'ActionOutput_google_docs_updatetablecolumnproperties'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
