# ![GCP][GCPLogo] Install Google Cloud Sdk Build Task

This task finds or installs the [Google Cloud SDK][CloudSdk].
It can then do some basic configuration.

## Usage

If the Google Cloud SDK is already installed for all users on the build agent,
this task is unnecessary. If, however, the Google Cloud SDK is installed for
the build agent user only, or not installed at all, you can use this task to find
or install it. Use this task before calling any other tasks that require the Google
Cloud SDK.

## Parameters

![Install Cloud SDK Parameters][InstallCloudSdkParameters]

  - **Send anonymous usage statistics to Google**: Help make Google Cloud SDK better
  by automatically sending [anonymous usage statistics][UsageStats]
  to Google. The Cloud SDK configuration will be updated with this value on every run.
  - **Config**: The name of the configuration to create or activate. If left blank, the
  active config will be used.
  - **Project**: Configure the Cloud SDK's current default project. If left blank, the
  current configuration will not change.
  - **Region**: Configure the Cloud SDK's current default compute/region. If left blank,
  the current configuration will not change.
  - **Zone**: Configure the Cloud SDK's current default compute/zone. If left blank,
  the current configuration will not change.
  - **Install Path**: The path on the agent to install the Cloud SDK. Defaults to '%LOCALAPPDATA%\\Google\\Cloud SDK'.
  - **Force Install**: Check this to force an install of the Cloud SDK even if it already exists on the path.
  - **Clean Install Path**: Check this to remove files from the target installation path.

[GCPLogo]: ../images/cloud_64x64.png
[InstallCloudSdkParameters]: ../images/screenshots/install-cloud-sdk-inputs.png
[CloudSdk]: https://cloud.google.com/sdk
[UsageStats]: https://cloud.google.com/sdk/usage-statistics
