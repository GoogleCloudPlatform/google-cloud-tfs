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

import * as mocks from 'common/register-mocks';
import {TaskLibAnswerExecResult} from 'vsts-task-lib/mock-answer';
import {Deployment} from '../../interfaces';
import * as tc from '../test-constants';

// clang-format off
export {
  clusterCredentialExecString,
  failResult,
  gcloudError,
  gcloudOutput,
  getDefaultAnswers,
  successResult,
} from '../test-constants';
// clang-format on

export function getDefaultRunner() {
  const runner = tc.getDefaultRunner();
  runner.setInput('deployType', tc.deployTypeValues);
  return runner;
}

export const deploymentName = 'deployment';
export const imageName = 'imageName';
export const imageTag = 'imageTag';
export const newImageTag = 'newImageTag';
export const replicasInt = 1;
export const replicas = replicasInt.toString(10);
export const moreReplicasInt = 2;
export const moreReplicas = moreReplicasInt.toString(10);
export const invalidReplicaString = 'Replicas!';
export const invalidReplicaNegitive = -4;
export const image = `${imageName}:${imageTag}`;
export const newImage = `${imageName}:${newImageTag}`;

export const kubectlGetDeploymentsExecString: string = [
  mocks.kubectlPath,
  'get deployments -o json --alsologtostderr',
  mocks.kubeConfigParam,
].join(' ');

const kubectlRunExecList = [
  mocks.kubectlPath,
  'run --port=8080 --record --alsologtostderr',
  mocks.kubeConfigParam,
  deploymentName,
  `--image=${image}`,
  `--replicas=${replicas}`,
];
export const kubectlRunExecString: string = kubectlRunExecList.join(' ');
export const kubectlRunDryRunExecString: string =
    kubectlRunExecList.concat('--dry-run=true').join(' ');

export const kubectlScaleExecString: string = [
  mocks.kubectlPath,
  'scale deployment --alsologtostderr',
  mocks.kubeConfigParam,
  deploymentName,
  `--replicas=${moreReplicas}`,
].join(' ');

export const kubectlSetImageExecString: string = [
  mocks.kubectlPath,
  'set image --record --alsologtostderr',
  mocks.kubeConfigParam,
  `deployment/${deploymentName}`,
  `${deploymentName}=${newImage}`,
].join(' ');

export const emptyDeploymentResult: TaskLibAnswerExecResult = {
  code: 0,
  stdout: JSON.stringify({items: []}),
};

const existingDeployment: Deployment = {
  metadata: {
    name: deploymentName,
  },
  spec: {
    replicas: 1,
    template: {
      spec: {
        containers: [{image: image}],
      },
    },
  },
};
export const existingDeploymentResult: TaskLibAnswerExecResult = {
  code: 0,
  stdout: JSON.stringify({items: [existingDeployment]}),
};
