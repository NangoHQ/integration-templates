import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-issue-events.js';

describe('sentry list-issue-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-issue-events',
        Model: 'ActionOutput_sentry_listissueevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
