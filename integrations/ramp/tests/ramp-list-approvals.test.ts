import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-approvals.js';

describe('ramp list-approvals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-approvals',
        Model: 'ActionOutput_ramp_listapprovals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
