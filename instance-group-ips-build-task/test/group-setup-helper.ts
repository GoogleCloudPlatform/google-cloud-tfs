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

import {exec} from 'child_process';
import {readFileSync} from 'fs';

export interface Output {
  task: string;
  stdout: string;
  stderr: string;
}

interface ManagedInstanceGroup {
  name: string;
  size: string|number;
}

interface Template {
  name: string;
}

interface StdStreams {
  stdout: string;
  stderr: string;
}

const tempateName = 'tfs-test-template';
const templateArg = `--template ${tempateName}`;
const formatArg = '--format json';

export class SetupHelper {
  readonly output: Output[] = [];
  private readonly projectId: string;

  private get zoneArg(): string { return `--zone ${this.zoneName}`; }
  private get projectArg(): string { return `--project="${this.projectId}"`; }

  private get credentialArg(): string {
    return `--credential-file-override="${this.credentialFile}"`;
  }

  private get authArgs(): string {
    return `${this.projectArg} ${this.credentialArg}`;
  }

  constructor(private readonly groupName: string,
              private readonly zoneName: string,
              private readonly credentialFile: string) {

    const contents = readFileSync(credentialFile).toString();
    this.projectId = JSON.parse(contents).project_id;
  }

  async findOrSetupTestGroupAsync(): Promise<void> {
    const testGroupExists = await this.testGroupExistsAsync();
    if (!testGroupExists) {
      await this.createTestGroupAsync();
    }
  }

  async execAsync(command: string): Promise<StdStreams> {
    return new Promise<StdStreams>((resolve, reject) => {
      exec(`${command} ${this.authArgs}`,
           (error: Error|null, stdout: string, stderr: string) => {
             if (error) {
               reject(error);
             } else {
               resolve({stdout, stderr});
             }
           });
    });
  }

  async testGroupExistsAsync(this: SetupHelper): Promise<boolean> {
    const listGroupsCommand = 'gcloud compute instance-groups managed list';
    const {stdout, stderr} =
        await this.execAsync(`${listGroupsCommand} ${formatArg}`);
    this.output.push({task : 'instance-groups list', stdout, stderr});

    const groups = JSON.parse(stdout) as ManagedInstanceGroup[];
    for (const group of groups) {
      if (group.name === this.groupName) {
        if (Number(group.size) !== 2) {
          await this.setTestGroupSizeAsync();
        }
        return true;
      }
    }
    return false;
  }

  async setTestGroupSizeAsync(): Promise<void> {
    const resizeCommand = 'gcloud compute instance-groups managed resize';
    const resizeArgs = `${this.groupName} ${this.zoneArg} --size 2`;
    const {stdout, stderr} =
        await this.execAsync(`${resizeCommand} ${resizeArgs}`);
    this.output.push({task : `resize ${this.groupName}`, stdout, stderr});
    await this.whenStableAsync();
  }

  async createTestGroupAsync(): Promise<void> {
    await this.findOrSetupTestTemplateAsync();
    const createCommand = 'gcloud compute instance-groups managed create';
    const createArgs =
        `${this.groupName} ${this.zoneArg} ${templateArg} --size 2`;
    const {stdout, stderr} =
        await this.execAsync(`${createCommand} ${createArgs}`);
    this.output.push({task : `create ${this.groupName}`, stdout, stderr});
    await this.whenStableAsync();
  }

  async whenStableAsync(): Promise<void> {
    const waitCommand =
        'gcloud compute instance-groups managed wait-until-stable';
    const waitArgs = `${this.groupName} ${this.zoneArg}`;
    const {stdout, stderr} = await this.execAsync(`${waitCommand} ${waitArgs}`);
    this.output.push({task : 'wait-until-stable', stdout, stderr});
  }

  async findOrSetupTestTemplateAsync(): Promise<void> {
    const templateExists = await this.findTestTemplateAsync();
    if (!templateExists) {
      await this.createTestTemplateAsync();
    }
  }

  async findTestTemplateAsync(): Promise<boolean> {
    const listTemplatesCommand = 'gcloud compute instance-templates list';
    const {stdout, stderr} =
        await this.execAsync(`${listTemplatesCommand} ${formatArg}`);
    this.output.push({task : 'instance-templates list', stdout, stderr});
    const templates = JSON.parse(stdout) as Template[];
    for (const template of templates) {
      if (template.name === tempateName) {
        return true;
      }
    }
    return false;
  }

  async createTestTemplateAsync(): Promise<void> {
    const createTemplateCommand = 'gcloud compute instance-templates create';
    const {stdout, stderr} =
        await this.execAsync(`${createTemplateCommand} ${tempateName}`);
    this.output.push({task : `create ${tempateName}`, stdout, stderr});
  }
}
