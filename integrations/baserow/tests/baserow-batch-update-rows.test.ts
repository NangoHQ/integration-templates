import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-update-rows.js';

describe('baserow batch-update-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-update-rows',
        Model: 'ActionOutput_baserow_batchupdaterows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
