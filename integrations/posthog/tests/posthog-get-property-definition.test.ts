import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-property-definition.js';

describe('posthog get-property-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-property-definition',
        Model: 'ActionOutput_posthog_getpropertydefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
