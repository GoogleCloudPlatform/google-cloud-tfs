# ![GCP][GCPLogo] Google Cloud SDK-Tool Installer Task

A build task for installing the [Google Cloud SDK][CloudSdk] using the [VSTS Tool Installers][ToolInstallers] feature.

## Usage

This task is faster than the existing [Install Google Cloud SDK][InstallCloudSdkBuildTask] build task,
and allows caching of Goolge Cloud SDK versions, but requires the [VSTS Tool Installers][ToolInstallers]
feature enabled.

## Parameters

![Google Cloud SDK Tool Installer Parameters][GoogleCloudSdkToolInstallerParameters]

 - **Version**: The version of the Cloud SDK. Leave blank to get the latest version.
 - **Allow Anonymous Usage Reporting**: Help make Google Cloud SDK better by automatically sending
 [anonymous usage statistics][UsageStats] to Google.

[CloudSdk]: https://cloud.google.com/sdk
[UsageStats]: https://cloud.google.com/sdk/usage-statistics
[ToolInstallers]: https://docs.microsoft.com/en-us/vsts/build-release/concepts/process/tasks#tool-installers
[GCPLogo]: ../images/cloud_64x64.png
[InstallCloudSdkBuildTask]: ../install-cloud-sdk-build-task/README.md
[GoogleCloudSdkToolInstallerParameters]: ../images/screenshots/cloud-sdk-tool-build-task-inputs.png
