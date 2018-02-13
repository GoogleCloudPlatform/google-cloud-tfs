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
import * as fs from 'fs';
import * as path from 'path';

const credentialFile =
    path.join('test', 'resources', 'Cloud Tools for TFS Testing.json');
const describeWithCredentialFile =
    fs.existsSync(credentialFile) ? describe : describe.skip;

interface KubectlVersion {
  clientVersion: {major: string, minor: string};
}

describeWithCredentialFile('functional tests', function(): void {
  this.timeout(0);
  let kubectlVersionPromise: Promise<KubectlVersion>;
  let taskOutput: TaskResult;
  let endpointAuth: string;
  const defaultVariableName = 'default_variable';
  let env: {[variableName: string]: string};

  before('start kubectl version', () => {
    endpointAuth = JSON.stringify({
      parameters : {
        certificate : fs.readFileSync(credentialFile).toString(),
      },
    });
    kubectlVersionPromise =
        new Promise<string>((resolve, reject) => {
          const kubectlProcess = spawn(
              'kubectl', [ 'version --client --output=json' ], {shell : true});
          kubectlProcess.on(
              'exit',
              () => resolve(kubectlProcess.stdout.read().toString().trim()));
          kubectlProcess.on('error', reject);
        }).then((stdoutString) => JSON.parse(stdoutString) as KubectlVersion);
  });

  beforeEach(async () => {
    taskOutput = undefined;
    env = {
      ['INPUT_serviceEndpoint'] : 'endpoint',
      ['ENDPOINT_AUTH_endpoint'] : endpointAuth,
      ['INPUT_command'] : '-h',
      ['INPUT_cluster'] : 'test-cluster',
      ['INPUT_zone'] : 'us-central1-a',
      ['INPUT_ignoreReturnCode'] : 'false',
      ['INPUT_outputVariable'] : defaultVariableName,
    };
  });

  afterEach('write task output on failure', async function(): Promise<void> {
    if (this.currentTest.state === 'failed') {
      taskOutput.logData();
      console.log('--- kubectlVersionPromise ---');
      console.log(JSON.stringify(await kubectlVersionPromise));
    }
  });

  it('should run kubectl version', async () => {
    const variableName = 'test_variable_name';
    env['INPUT_command'] = 'version --client --output=json';
    env['INPUT_outputVariable'] = variableName,

    taskOutput = await TaskResult.runTask('run.js', env);

    const variableValue =
        JSON.parse(taskOutput.getVariable(variableName)) as KubectlVersion;
    const kubectlVersionOutput = await kubectlVersionPromise;
    assert.equal(variableValue.clientVersion.major,
                 kubectlVersionOutput.clientVersion.major);
    assert.equal(variableValue.clientVersion.minor,
                 kubectlVersionOutput.clientVersion.minor);
  });

  const requiredInputs = [ 'serviceEndpoint', 'command', 'cluster', 'zone' ];
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

    assert.equal(taskOutput.getStatus()[0], 'succeeded');
    assert.equal(taskOutput.getVariable(defaultVariableName), undefined);
  });

  it('should fail for non-existant command', async () => {
    env['INPUT_command'] = 'this does not exist';
    env['INPUT_ignoreReturnCode'] = 'false';

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal(taskOutput.getStatus()[0], 'failed');
  });

  it('should succeed for non-existant command when ignoring return code',
     async () => {
       env['INPUT_command'] = 'this does not exist';
       env['INPUT_ignoreReturnCode'] = 'true';

       taskOutput = await TaskResult.runTask('run.js', env);

       assert.equal(taskOutput.getStatus()[0], 'succeeded');
     });
});
