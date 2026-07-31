import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-approval-status.js';

describe('ironclad update-approval-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-approval-status',
        Model: 'ActionOutput_ironclad_updateapprovalstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
