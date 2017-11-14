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


import {SuccessOption} from 'common/asserts';
import * as mocks from 'common/register-mocks';
import * as path from 'path';
import * as ma from 'vsts-task-lib/mock-answer';
import {TaskMockRunner} from 'vsts-task-lib/mock-run';

export const endpoint = 'endpointName';
export const cluster = 'clusterName';
export const zone = 'zoneName';
export const deployTypeValues = 'values';
export const deployTypeConfig = 'config';
export const deployTypeInvalid = 'invalid';
const zoneParam = `--zone=${zone}`;
export const clusterCredentialExecString = [
  mocks.gcloudPath,
  'container clusters get-credentials',
  cluster,
  zoneParam,
  mocks.projectParam,
  mocks.credentialParam,
].join(' ');

export const gcloudOutput = '[gcloud output]';
export const gcloudError = '[gcloud error]';

export const successResult: ma.TaskLibAnswerExecResult = {
  'code': 0,
  'stdout': gcloudOutput,
  'stderr': gcloudError,
};

export const failResult: ma.TaskLibAnswerExecResult = {
  'code': 1,
  'stdout': gcloudOutput,
  'stderr': gcloudError,
};

export const successOption: SuccessOption = {
  gcloudOutput: gcloudOutput,
}

export function getDefaultRunner(): TaskMockRunner {
  const taskPath = path.join(__dirname, '..', 'deploy-gke.js');
  const runner = new TaskMockRunner(taskPath);

  runner.setInput('serviceEndpoint', endpoint);
  runner.setInput('cluster', cluster);
  runner.setInput('zone', zone);
  runner.setInput('dryRun', 'false');
  return runner;
}

export function getDefaultAnswers(): ma.TaskLibAnswers {
  const answers = mocks.getDefaultAnswers();
  answers.exec[clusterCredentialExecString] = successResult;
  return answers;
}
