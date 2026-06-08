import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-event-definition.js';

describe('posthog get-event-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-event-definition',
        Model: 'ActionOutput_posthog_geteventdefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
