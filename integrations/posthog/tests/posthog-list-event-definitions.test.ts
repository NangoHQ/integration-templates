import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-event-definitions.js';

describe('posthog list-event-definitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-event-definitions',
        Model: 'ActionOutput_posthog_listeventdefinitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
