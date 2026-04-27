import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-record.js';

describe('airtable delete-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-record',
        Model: 'ActionOutput_airtable_deleterecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
