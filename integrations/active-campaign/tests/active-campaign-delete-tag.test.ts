import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-tag.js';

describe('active-campaign delete-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-tag',
        Model: 'ActionOutput_active_campaign_deletetag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
