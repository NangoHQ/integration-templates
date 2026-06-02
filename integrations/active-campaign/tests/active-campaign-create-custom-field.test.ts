import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-custom-field.js';

describe('active-campaign create-custom-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-custom-field',
        Model: 'ActionOutput_active_campaign_createcustomfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
