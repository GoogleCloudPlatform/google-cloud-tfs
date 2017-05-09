# ![GCPLogo][GCPLogo] Set Virtual Machine Login build task

This task gets the IP address and account password for a [Google Compute Engine][GCE]
virtual machine. It outputs these values to build variables that can be used by subsequent
tasks, such as the [IIS Web App Deployment Using WinRM][WinRmTasks] tasks.

### **Warning**
The password for the user will be changed every time you run this task. Use a new,
unused username such as `TFSUser`.


## Usage

![Set Login Parameters][SetLoginParameters]

To use this task, select the service endpoint for the [Google Cloud Platform][GCP] project you wish to connect to.
Write the name of the zone and the virtual machine name in the given boxes.
Select a user name. If the user name does not exist, it will be created. If it does
exist, the password will be reset.

For the output variable fields, put the name of the variable you wish to use.
Do not put the actual variable, as the task will then put the values in the variable
named by the contents of the input. e.g. To use "$(GcpVmPassword) in future build
tasks, input "GcpVmPassword".

When this task runs, it will connect to [Google Compute Engine][GCE], create or reset the
password of the given user on the given VM, and put the Password and IP address in
the given variables.

## Build process

![GCE Build Process][GceBuildProcess]

You can use the variables set by the Get Google Compute VM password task in conjunction
with the existing [IIS Web App Deployment Using WinRM][WinRmTasks] tasks to deploy
an ASP.NET application to your Google Compute VMs.



[GCPLogo]: ../images/cloud_64x64.png
[SetLoginParameters]: ../images/screenshots/set-login-inputs.png
[GceBuildProcess]: ../images/screenshots/GceBuildProcess.png
[WinRmTasks]: https://marketplace.visualstudio.com/items?itemName=ms-vscs-rm.iiswebapp
[GCP]: https://cloud.google.com
[GCE]: https://cloud.google.com/compute
