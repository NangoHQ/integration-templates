import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-approval-requests.js';

describe('ironclad list-approval-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-approval-requests',
        Model: 'ActionOutput_ironclad_listapprovalrequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
