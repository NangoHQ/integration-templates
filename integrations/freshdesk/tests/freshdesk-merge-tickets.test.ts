import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-tickets.js';

describe('freshdesk merge-tickets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-tickets',
        Model: 'ActionOutput_freshdesk_mergetickets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
