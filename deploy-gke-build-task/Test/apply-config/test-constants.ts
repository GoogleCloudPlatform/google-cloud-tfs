// Copyright 2017 Google Inc. All Rights Reserved
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

import * as mocks from 'common/register-mocks';
import * as path from 'path';
import {TaskLibAnswers} from 'vsts-task-lib/mock-answer';
import {TaskMockRunner} from 'vsts-task-lib/mock-run';

import * as tc from '../test-constants';

export {
  clusterCredentialExecString,
  failResult,
  getDefaultAnswers,
  successResult,
} from '../test-constants';

export function getDefaultRunner() {
  const runner = tc.getDefaultRunner();
  runner.setInput('deployType', tc.deployTypeConfig);
  return runner;
}

export const configPath = path.resolve('config.yaml');
export const configPathParam = `"${configPath}"`;
export const imageName = 'imageName';
export const imageTag = 'imageTag';
const kubectlApplyExecList = [
  mocks.kubectlPath,
  'apply -f --alsologtostderr',
  configPathParam,
  mocks.kubeConfigParam,
];
export const kubectlApplyExecString = kubectlApplyExecList.join(' ');
export const kubectlApplyDryRunExecString =
    kubectlApplyExecList.concat('--dry-run=true').join(' ');

class Config {
  contents: string;
  newContents?: string;
  get map() { return new Map([[configPath, this.contents]])}
  constructor(contents: string, newContents?: string) {
    this.contents = contents;
    this.newContents = newContents;
  }
}

interface Configs {
  [key: string]: Config;
  json: Config;
  yaml: Config;
}

const jsonContents = `
{
  "image": "${imageName}:oldTag"
}
`;
const newJsonContents = `{"image":"${imageName}:${imageTag}"}`;
const yamlContents = `
image: ${imageName}:oldTag
`;
const newYamlContents = `image: '${imageName}:${imageTag}'`;
const invalidContents = `
{This:}, looks:, like:, a:, csv:, file!
`;
export const invalidConfig = new Config(invalidContents);
export const configs: Configs = {
  json: new Config(jsonContents, newJsonContents),
  yaml: new Config(yamlContents, newYamlContents),
}
