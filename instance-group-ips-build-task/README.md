# ![GCP][GcpLogo] Instance Group IPs Build Task

Collect the external IPs of the virtual machines in an [Instance Group][InstanceGroup].

## Usage

Use this task before deploying an IIS Web App.

## Parameters

![Instance Group IPs Build Task Inputs][instance-group-ips-inputs]

 - GCP connection:
   The service endpoint defining the GCP project containing the instance group,
   and the service account to authenticate with.
 - Type: Select either Zone or Region depending on the scope of the instance group.
 - Zone/Region: The name of the zone or region the instance group exists in.
 - Instance Group Name: The name of the instance group.
 - Build Variable Name: The name of the variable to save the external IPs to.
 - Separator: The text separator between the IPs of the VMs. Defaults to `,`.

[GcpLogo]: ../images/cloud_64x64.png
[instance-group-ips-inputs]: ../images/screenshots/instance-group-ips-inputs.png
[InstanceGroup]: https://cloud.google.com/compute/docs/instance-groups


