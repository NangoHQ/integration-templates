import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-custom-objects.js';

describe('hubspot fetch-custom-objects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-custom-objects',
        Model: 'ActionOutput_hubspot_fetchcustomobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
