import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-record.js';

describe('airtable create-record encoded path tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-record-encoded-path',
        Model: 'ActionOutput_airtable_createrecord'
    });

    it('should URL-encode a table name containing reserved characters', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
