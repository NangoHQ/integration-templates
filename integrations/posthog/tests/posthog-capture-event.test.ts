import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/capture-event.js';

describe('posthog capture-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'capture-event',
        Model: 'ActionOutput_posthog_captureevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
