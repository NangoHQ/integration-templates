import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-team-from-project.js';

describe('sentry remove-team-from-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-team-from-project',
        Model: 'ActionOutput_sentry_removeteamfromproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
