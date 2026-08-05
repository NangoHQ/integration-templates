import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deal-custom-field-groups.js';

describe('pipelinecrm list-deal-custom-field-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deal-custom-field-groups',
        Model: 'ActionOutput_pipelinecrm_listdealcustomfieldgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
