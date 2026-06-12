import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unassign-flow-by-crm-id.js';

describe('gong-oauth unassign-flow-by-crm-id tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unassign-flow-by-crm-id',
        Model: 'ActionOutput_gong_oauth_unassignflowbycrmid'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
