import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-dynamic-template.js';

describe('sendgrid update-dynamic-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-dynamic-template',
        Model: 'ActionOutput_sendgrid_updatedynamictemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
