import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-records.js';

describe('airtable list-records encoded path tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-records-encoded-path',
        Model: 'ActionOutput_airtable_listrecords'
    });

    it('should URL-encode a table name containing reserved characters', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
