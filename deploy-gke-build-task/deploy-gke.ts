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

/**
 * @fileoverview This is the main script run by the deploy-gke-build-task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {KubeEndpoint} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib/task';

import {applyConfig} from './gke-apply';
import {runOrSetDeployment} from './gke-set-deployment';

/**
 * Runs the deploy-gke-build-task
 */
async function run(): Promise<void> {
  // Check that kubectl and gcloud exists.
  task.which('gcloud', true);
  task.which('kubectl', true);

  // Get inputs from GUI.
  // The id of the GCP service endpoint to get the credentials from.
  const endpointId = task.getInput('serviceEndpoint', true);
  const cluster = task.getInput('cluster', true);
  const zone = task.getInput('zone', true);
  // The deployment method.
  const deployType = task.getInput('deployType', true);
  const dryRun = task.getBoolInput('dryRun', true);

  // Get json key file data from service endpoint.
  const endpoint = new KubeEndpoint(endpointId, cluster, zone);
  await endpoint.usingAsync(async () => {
    switch (deployType) {
    case 'config':
      await applyConfig(dryRun, endpoint);
      break;
    case 'values':
      await runOrSetDeployment(dryRun, endpoint);
      break;
    default:
      throw new Error(`Invalid deployType "${deployType}"`);
    }
  });
}

catchAll(run());
