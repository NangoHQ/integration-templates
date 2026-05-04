import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-update-records.js';

describe('airtable batch-update-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-update-records',
        Model: 'ActionOutput_airtable_batchupdaterecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
