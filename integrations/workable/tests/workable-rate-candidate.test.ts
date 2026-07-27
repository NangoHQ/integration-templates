import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/rate-candidate.js';

describe('workable rate-candidate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'rate-candidate',
        Model: 'ActionOutput_workable_ratecandidate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
