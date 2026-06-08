import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-dashboard.js';

describe('posthog create-dashboard tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-dashboard',
        Model: 'ActionOutput_posthog_createdashboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
