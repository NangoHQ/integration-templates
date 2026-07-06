import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/track-event.js';

describe('mixpanel track-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'track-event',
        Model: 'ActionOutput_mixpanel_trackevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
