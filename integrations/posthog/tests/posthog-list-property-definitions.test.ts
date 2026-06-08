import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-property-definitions.js';

describe('posthog list-property-definitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-property-definitions',
        Model: 'ActionOutput_posthog_listpropertydefinitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
