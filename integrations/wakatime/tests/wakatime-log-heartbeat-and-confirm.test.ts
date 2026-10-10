import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/log-heartbeat-and-confirm.js';

describe('wakatime log-heartbeat-and-confirm tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'log-heartbeat-and-confirm',
        Model: 'ActionOutput_wakatime_logheartbeatandconfirm'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
