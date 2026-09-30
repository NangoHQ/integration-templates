import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-team-projects.js';

describe('sentry list-team-projects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-team-projects',
        Model: 'ActionOutput_sentry_listteamprojects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
