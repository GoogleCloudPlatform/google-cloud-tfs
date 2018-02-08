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

import {KubeEndpoint} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib/task';

import {runKubectl} from './kubectl-build-task';

/**
 * This is the entry point for the gcloud build task.
 * @author JimWP@google.com (Jim Przybylinski)
 */
function run(): void {
  // Check that kubectl exists.
  task.which('gcloud', true);
  const kubectlPath = task.which('kubectl', true);

  // Get Inputs from GUI.
  const endpointId = task.getInput('serviceEndpoint', true);
  const cluster = task.getInput('cluster', true);
  const zone = task.getInput('zone');
  runKubectl({
    kubectlTool: task.tool(kubectlPath),
    endpoint: new KubeEndpoint(endpointId, cluster, zone),
    command: task.getInput('command', true),
    ignoreReturnCode: task.getBoolInput('ignoreReturnCode'),
    outputVariable: task.getInput('outputVariable', false),
  });
}

catchAll(run);
