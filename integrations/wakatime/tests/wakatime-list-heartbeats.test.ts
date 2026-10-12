import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-heartbeats.js';

describe('wakatime list-heartbeats tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-heartbeats',
        Model: 'ActionOutput_wakatime_listheartbeats'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
