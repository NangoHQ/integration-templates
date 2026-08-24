import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-ticket-watcher.js';

describe('freshdesk add-ticket-watcher tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-ticket-watcher',
        Model: 'ActionOutput_freshdesk_addticketwatcher'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
