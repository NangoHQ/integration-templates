import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-summaries.js';

describe('wakatime get-summaries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-summaries',
        Model: 'ActionOutput_wakatime_getsummaries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
