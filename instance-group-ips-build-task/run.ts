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

import {Endpoint} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib/task';

import {getInstanceGroupIps} from './instance-group-ips';

/**
 * @fileoverview This is the entry point of the instance group ips task.
 * @author jimwp@google.com (Jim Przybylinski)
 */

/**
 * The entry point for the instance group ips task. Collects the inputs and
 * sends them to the implementation function.
 */
async function run(): Promise<void> {
  const endpointId = task.getInput('serviceEndpoint', true);
  const locationScope = task.getInput('locationScope', true);
  let location: string;
  if (locationScope === 'zone') {
    location = task.getInput('zone', true);
  } else if (locationScope === 'region') {
    location = task.getInput('region', true);
  } else {
    throw new Error(`Unknown location scope: ${locationScope}`);
  }

  getInstanceGroupIps({
    endpoint : new Endpoint(endpointId),
    locationScope,
    location,
    instanceGroupName : task.getInput('instanceGroupName'),
    separator : task.getInput('separator', false) || undefined,
    buildVariableName : task.getInput('buildVariableName', true),
  });
}

catchAll(run());
