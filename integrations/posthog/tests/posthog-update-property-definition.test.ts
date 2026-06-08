import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-property-definition.js';

describe('posthog update-property-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-property-definition',
        Model: 'ActionOutput_posthog_updatepropertydefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
