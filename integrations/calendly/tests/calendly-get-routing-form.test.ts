import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-routing-form.js';

describe('calendly get-routing-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-routing-form',
        Model: 'ActionOutput_calendly_getroutingform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
