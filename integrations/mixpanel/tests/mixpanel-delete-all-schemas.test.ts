import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-all-schemas.js';

describe('mixpanel delete-all-schemas tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-all-schemas',
        Model: 'ActionOutput_mixpanel_deleteallschemas'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
