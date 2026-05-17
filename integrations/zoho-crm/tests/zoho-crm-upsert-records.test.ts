import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-records.js';

describe('zoho-crm upsert-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-records',
        Model: 'ActionOutput_zoho_crm_upsertrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
