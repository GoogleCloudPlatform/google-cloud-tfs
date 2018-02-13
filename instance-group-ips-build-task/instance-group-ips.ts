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

import {Endpoint, getDefaultExecOptions} from 'common/exec-options';
import * as task from 'vsts-task-lib/task';

/**
 * @fileoverview This is the implementation of the instance group ips task.
 * @author jimwp@google.com (Jim Przybylinski)
 */

/**
 * The path for retrieving the external IPs of a virtual machine.
 * Copied from the gcloud default EXTERNAL_IP field.
 */
const externalIpResource =
  'networkInterfaces[].accessConfigs[0].natIP.notnull().list()';
/**
 * The path for the name of a virtual machine.
 */
const instanceNameKey = 'instance.scope().segment(2)';

/**
 * The path for the zone of a virtual machine.
 */
const instanceZoneKey = 'instance.scope().segment(0)';

/**
 * Interface describing the inputs to {@link getInstanceGroupIps}
 */
export interface GetInstanceGroupIpsOptions {
  endpoint: Endpoint;
  locationScope: string;
  location: string;
  instanceGroupName: string;
  separator?: string;
  buildVariableName: string;
  di?: {task: typeof task};
}

/**
 * The implementation for finding an instance group and getting the external
 * IPs of its member virtual machines.
 */
export async function getInstanceGroupIps(
    {
      endpoint,
      locationScope,
      location,
      instanceGroupName,
      buildVariableName,
      separator = ',',
      di = {task},
    }: GetInstanceGroupIpsOptions,
    ): Promise<void> {
  await endpoint.usingAsync(async () => {
    const gcloudToolPath = di.task.which('gcloud');

    const instanceLines: string[] = [];
    await di.task.tool(gcloudToolPath)
        .line('compute instance-groups list-instances')
        .arg(instanceGroupName)
        .arg(`--${locationScope}`)
        .arg(location)
        .arg('--format')
        .arg(`"csv[no-heading](${instanceNameKey}, ${instanceZoneKey})"`)
        .arg(endpoint.projectParam)
        .arg(Endpoint.credentialParam)
        .on('stdline', (...lines: string[]) => instanceLines.push(...lines))
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
        .arg(`"${filters.join(' OR ')}"`)
        .arg(endpoint.projectParam)
        .arg(Endpoint.credentialParam)
        .on('stdline', (...lines: string[]) => ips.push(...lines))
        .exec(getDefaultExecOptions());
    di.task.setVariable(buildVariableName, ips.join(separator));
  });
}
