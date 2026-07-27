import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/approve-timeoff-request.js';

describe('workable approve-timeoff-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'approve-timeoff-request',
        Model: 'ActionOutput_workable_approvetimeoffrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
