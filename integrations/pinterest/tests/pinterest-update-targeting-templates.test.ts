import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-targeting-templates.js';

describe('pinterest update-targeting-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-targeting-templates',
        Model: 'ActionOutput_pinterest_updatetargetingtemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
