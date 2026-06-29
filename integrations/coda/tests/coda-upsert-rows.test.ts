import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-rows.js';

describe('coda upsert-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-rows',
        Model: 'ActionOutput_coda_upsertrows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    }, 20000);
});
