import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-delete-tickets.js';

describe('freshdesk bulk-delete-tickets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-delete-tickets',
        Model: 'ActionOutput_freshdesk_bulkdeletetickets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
