import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workflow-approvals.js';

describe('ironclad list-workflow-approvals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workflow-approvals',
        Model: 'ActionOutput_ironclad_listworkflowapprovals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
