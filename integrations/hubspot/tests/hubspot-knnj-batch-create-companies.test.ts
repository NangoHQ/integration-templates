import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-create-companies.js';

describe('hubspot-knnj batch-create-companies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-create-companies',
        Model: 'ActionOutput_hubspot_knnj_batchcreatecompanies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
