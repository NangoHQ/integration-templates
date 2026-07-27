import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-candidate.js';

describe('workable copy-candidate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'copy-candidate',
        Model: 'ActionOutput_workable_copycandidate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
