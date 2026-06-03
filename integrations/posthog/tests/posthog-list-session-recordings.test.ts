import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-session-recordings.js';

describe('posthog list-session-recordings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-session-recordings',
        Model: 'ActionOutput_posthog_listsessionrecordings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
