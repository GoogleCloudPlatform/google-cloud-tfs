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

import {getDefaultExecOptions} from 'common/exec-options';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as task from 'vsts-task-lib/task';
import * as toolLib from 'vsts-task-tool-lib/tool';

const cloudSdkId = 'google-cloud-sdk';
const urlRoot = 'http://dl.google.com/dl/cloudsdk/channels/rapid';
const downloadUrlRoot = `${urlRoot}/downloads`;
const versionDoc = `${urlRoot}/components-2.json`;

export class CloudSdkPackage {
  readonly version: string;
  private toolPath: string;

  constructor(versionString: string, di = {toolLib}) {
    this.version = di.toolLib.cleanVersion(versionString);
    if (!(this.version && this.version.length > 0)) {
      throw new Error(`Given version ${versionString} is not a valid version.`);
    }
    this.toolPath = di.toolLib.findLocalTool(cloudSdkId, this.version);
  }

  static async queryLatestVersion(di = {http}): Promise<string> {
    const message = await new Promise<http.IncomingMessage>(
        (resolve,
         reject) => { di.http.get(versionDoc, resolve).on('error', reject); });

    const data = await new Promise<string>((resolve) => {
      let rawData = '';
      message.on('data', (chunk: string) => rawData += chunk);
      message.on('end', () => resolve(rawData));
    });
    return JSON.parse(data)['version'] as string;
  }

  static async createPackage(versionSpec?: string, di = {http, task, toolLib}):
      Promise<CloudSdkPackage> {
    let version: string;
    if (!versionSpec) {
      version = await CloudSdkPackage.queryLatestVersion(di);
      di.task.debug(`Latest version ${version} selected.`);
    } else if (di.toolLib.isExplicitVersion(versionSpec)) {
      version = versionSpec;
      di.task.debug(`Version ${version} selected.`);
    } else {
      throw new Error('Version, if set, must be an explicit version.');
    }
    return new CloudSdkPackage(version, di);
  }

  isCached(): boolean { return this.toolPath && this.toolPath.length > 0; }

  getToolPath(): string { return this.toolPath; }

  async init(allowReporting: boolean, di = {toolLib, task}): Promise<void> {
    di.toolLib.prependPath(path.join(this.toolPath, 'google-cloud-sdk', 'bin'));
    await di.task.tool(di.task.which('gcloud'))
        .line(`config set disable_usage_reporting ${!allowReporting}`)
        .exec(getDefaultExecOptions());
  }

  async aquire(allowReporting: boolean,
               di = {toolLib, task, os}): Promise<void> {
    const downloadPath: string =
        await di.toolLib.downloadTool(this.getDownloadUrl(di));
    const extractedPath: string = await this.extractArchive(downloadPath, di);
    this.toolPath = await di.toolLib.cacheDir(extractedPath, cloudSdkId,
                                              this.version, di.os.arch());
    const installerPath: string =
        path.join(this.toolPath, 'google-cloud-sdk', this.getInstallFile(di));
    const execOptions = getDefaultExecOptions();
    execOptions.env['CLOUDSDK_CORE_DISABLE_PROMPTS'] = 'true';
    execOptions.env['PATH'] = process.env['PATH'];
    execOptions.env['PROCESSOR_ARCHITECTURE'] =
        process.env['PROCESSOR_ARCHITECTURE'];
    await di.task.tool(installerPath)
        .line('--quiet')
        .line(`--usage-reporting ${allowReporting}`)
        .line('--additional-components kubectl')
        .exec(execOptions);
    di.toolLib.prependPath(path.join(this.toolPath, 'google-cloud-sdk', 'bin'));
  }

  private getInstallFile(di = {os}): string {
    switch (di.os.platform()) {
    case 'win32':
      return 'install.bat';
    case 'linux':
      return 'install.sh';
    case 'darwin':
      return 'install.sh';
    default:
      throw new Error(`Unsupported operating system: ${di.os.platform()}.`);
    }
  }

  private getDownloadUrl(di = {os}): string {
    const filePrefix = `google-cloud-sdk-${this.version}`;
    const archString = this.getOsArchString(di);
    switch (di.os.platform()) {
    case 'win32':
      return `${downloadUrlRoot}/${filePrefix}-windows-` +
             `${archString}-bundled-python.zip`;
    case 'linux':
      return `${downloadUrlRoot}/${filePrefix}-linux-${archString}.tar.gz`;
    case 'darwin':
      return `${downloadUrlRoot}/${filePrefix}-darwin-${archString}.tar.gz`;
    default:
      throw new Error(`Unsupported operating system: ${di.os.platform()}.`);
    }
  }

  private getOsArchString(di = {os}): string {
    switch (di.os.arch()) {
    case 'x64':
      return 'x86_64';
    case 'x86':
      return 'x86';
    default:
      throw new Error(`Unsupported architecture: ${di.os.arch()}`);
    }
  }

  private async extractArchive(file: string,
                               di = {toolLib, os}): Promise<string> {
    switch (di.os.platform()) {
    case 'win32':
      return await di.toolLib.extractZip(file);
    case 'linux':
      return await di.toolLib.extractTar(file);
    case 'darwin':
      return await di.toolLib.extractTar(file);
    default:
      throw new Error(`Unsupported operating system: ${di.os.platform()}.`);
    }
  }
}
