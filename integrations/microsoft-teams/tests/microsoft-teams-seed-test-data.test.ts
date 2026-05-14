import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/seed-test-data.js';

describe('microsoft-teams seed-test-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'seed-test-data',
        Model: 'ActionOutput_microsoft_teams_seedtestdata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
