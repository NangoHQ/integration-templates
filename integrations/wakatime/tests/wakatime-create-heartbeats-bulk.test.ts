import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-heartbeats-bulk.js';

describe('wakatime create-heartbeats-bulk tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-heartbeats-bulk',
        Model: 'ActionOutput_wakatime_createheartbeatsbulk'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
