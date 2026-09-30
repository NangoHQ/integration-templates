import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-team-members.js';

describe('sentry list-team-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-team-members',
        Model: 'ActionOutput_sentry_listteammembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
