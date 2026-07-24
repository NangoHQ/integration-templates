import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-talent-pool-candidate.js';

describe('workable create-talent-pool-candidate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-talent-pool-candidate',
        Model: 'ActionOutput_workable_createtalentpoolcandidate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
