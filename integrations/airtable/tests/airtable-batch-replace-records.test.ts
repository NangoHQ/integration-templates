import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-replace-records.js';

describe('airtable batch-replace-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-replace-records',
        Model: 'ActionOutput_airtable_batchreplacerecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
