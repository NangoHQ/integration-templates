import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-team-to-project.js';

describe('sentry add-team-to-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-team-to-project',
        Model: 'ActionOutput_sentry_addteamtoproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
