import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-create-records.js';

describe('airtable batch-create-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-create-records',
        Model: 'ActionOutput_airtable_batchcreaterecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
