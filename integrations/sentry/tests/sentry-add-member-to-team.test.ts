import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-member-to-team.js';

describe('sentry add-member-to-team tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-member-to-team',
        Model: 'ActionOutput_sentry_addmembertoteam'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
