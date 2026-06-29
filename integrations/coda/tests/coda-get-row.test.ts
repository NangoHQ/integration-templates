import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-row.js';

describe('coda get-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-row',
        Model: 'ActionOutput_coda_getrow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
