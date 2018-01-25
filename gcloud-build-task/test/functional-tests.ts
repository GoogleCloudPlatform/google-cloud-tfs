// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {spawn} from 'child_process';
import {TaskResult} from 'common/task-result';

describe('functional tests', function(): void {
  this.timeout(0);
  let gcloudVersionPromise: Promise<string>;
  let taskOutput: TaskResult;
  const endpointAuth = JSON.stringify({
    parameters : {certificate : JSON.stringify({project_id : 'projectId'})},
  });
  const variableName = 'outputVariable';
  let env: {[variableName: string]: string};

  before('start gcloud version', () => {
    gcloudVersionPromise = new Promise<string>((resolve, reject) => {
      const gcloudProcess =
          spawn('gcloud', [ 'version --format=json' ], {shell : true});
      gcloudProcess.on(
          'exit', () => resolve(gcloudProcess.stdout.read().toString().trim()));
      gcloudProcess.on('error', reject);
    });
  });

  beforeEach(async () => {
    taskOutput = null;
    env = {
      ['INPUT_serviceEndpoint'] : 'endpoint',
      ['ENDPOINT_AUTH_endpoint'] : endpointAuth,
      ['INPUT_command'] : '-h',
      ['INPUT_includeProjectParam'] : 'false',
      ['INPUT_ignoreReturnCode'] : 'false',
      ['INPUT_outputVariable'] : variableName,
    };
  });

  afterEach('write task output on failure', async function(): Promise<void> {
    if (this.currentTest.state === 'failed') {
      taskOutput.logData();
    }
  });

  it('should run gcloud version', async () => {
    const gcloudVersionOutput = await gcloudVersionPromise;
    env['INPUT_command'] = 'version --format=json';

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.deepEqual(JSON.parse(gcloudVersionOutput),
                     JSON.parse(taskOutput.getVariable(variableName)));
  });

  const requiredInputs = [ 'serviceEndpoint', 'command' ];
  for (const input of requiredInputs) {
    it(`should fail missing required input ${input}`, async () => {
      env[`INPUT_${input}`] = undefined;

      taskOutput = await TaskResult.runTask('run.js', env);
      assert.equal(taskOutput.getStatus()[0], 'failed');
    });
  }

  it(`should succeed missing optional input outputVariable`, async () => {
    env[`INPUT_outputVariable`] = undefined;

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal('succeeded', taskOutput.getStatus()[0]);
    assert.equal(undefined, taskOutput.getVariable(variableName));
  });

  it('should fail for non-existant command', async () => {
    env['INPUT_command'] = 'this does not exist';
    env['INPUT_ignoreReturnCode'] = 'false';

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal('failed', taskOutput.getStatus()[0]);
  });

  it('should succeed for non-existant command when ignoring return code',
     async () => {
       env['INPUT_command'] = 'this does not exist';
       env['INPUT_ignoreReturnCode'] = 'true';

       taskOutput = await TaskResult.runTask('run.js', env);

       assert.equal('succeeded', taskOutput.getStatus()[0]);
     });
});
