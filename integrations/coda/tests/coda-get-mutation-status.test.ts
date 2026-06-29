import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-mutation-status.js';

describe('coda get-mutation-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-mutation-status',
        Model: 'ActionOutput_coda_getmutationstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
