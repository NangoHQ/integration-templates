import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-information-barrier-policy.js';

describe('zoom-cc delete-information-barrier-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-information-barrier-policy',
        Model: 'ActionOutput_zoom_cc_deleteinformationbarrierpolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
