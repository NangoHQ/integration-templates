import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-candidate.js';

describe('ashby update-candidate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-candidate',
        Model: 'ActionOutput_ashby_updatecandidate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
