import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-create-rows.js';

describe('baserow batch-create-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-create-rows',
        Model: 'ActionOutput_baserow_batchcreaterows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
