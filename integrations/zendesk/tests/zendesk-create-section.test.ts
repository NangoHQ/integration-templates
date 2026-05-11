import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-section.js';

describe('zendesk create-section tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-section',
        Model: 'ActionOutput_zendesk_createsection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
