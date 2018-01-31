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
 * @fileoverview This is the i run by the instance group ips task.
 * @author jimwp@google.com (Jim Przybylinski)
 */

import {Endpoint, getDefaultExecOptions} from 'common/exec-options';
import * as task from 'vsts-task-lib/task';

const externalIpResource =
    'networkInterfaces[].accessConfigs[0].natIP.notnull().list()';
const instanceNameKey = 'instance.scope().segment(2)';
const instanceZoneKey = 'instance.scope().segment(0)';

export interface GetInstanceGroupIpsOptions {
  endpoint: Endpoint;
  locationScope: string;
  location: string;
  instanceGroupName: string;
  separator?: string;
  buildVariableName: string;
  di?: {task: typeof task};
}

export async function getInstanceGroupIps(
    {
      endpoint,
      locationScope,
      location,
      instanceGroupName,
      separator = ',',
      buildVariableName,
      di = {task},
    }: GetInstanceGroupIpsOptions,
    ): Promise<void> {
  await endpoint.usingAsync(async () => {
    const instanceLines: string[] = [];
    const gcloudToolPath = di.task.which('gcloud');
    await di.task.tool(gcloudToolPath)
        .line('compute instance-groups list-instances')
        .arg('--format')
        .arg(`csv[no-heading](${instanceNameKey}, ${instanceZoneKey})`)
        .arg(instanceGroupName)
        .arg(`--${locationScope}`)
        .arg(location)
        .arg(endpoint.projectParam)
        .arg(Endpoint.credentialParam)
        .on('stdline', instanceLines.push)
        .exec(getDefaultExecOptions());

    const filters: string[] = [];
    for (const line of instanceLines) {
      const [name, zone] = line.split(',');
      filters.push(`(name=${name} AND zone:${zone})`);
    }

    const ips: string[] = [];
    await di.task.tool(gcloudToolPath)
        .line('compute instances list')
        .arg('--format')
        .arg(`value(${externalIpResource})`)
        .arg('--filter')
        .arg(filters.join(' OR '))
        .arg(endpoint.projectParam)
        .arg(Endpoint.credentialParam)
        .on('stdline', ips.push)
        .exec(getDefaultExecOptions());
    di.task.setVariable(buildVariableName, ips.join(separator));
  });
}
