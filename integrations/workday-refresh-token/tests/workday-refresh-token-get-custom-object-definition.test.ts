import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-custom-object-definition.js';

describe('workday-refresh-token get-custom-object-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-custom-object-definition',
        Model: 'ActionOutput_workday_refresh_token_getcustomobjectdefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
