import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-delete-records.js';

describe('airtable batch-delete-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-delete-records',
        Model: 'ActionOutput_airtable_batchdeleterecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
