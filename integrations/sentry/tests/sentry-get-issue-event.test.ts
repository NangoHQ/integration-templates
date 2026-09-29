import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-issue-event.js';

describe('sentry get-issue-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-issue-event',
        Model: 'ActionOutput_sentry_getissueevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
