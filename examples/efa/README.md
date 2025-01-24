# EFA Support

Enabling EFA support for a node group will do the following:
- All EFA interfaces supported by the instance will be exposed on the launch template used by the node group
- A `clustered` placement group will be created and passed to the launch template
- Checks will be performed to ensure that the instance type supports EFA and that the specified AZ is supported by the chosen instance type

The GPU optimized AMIs include all necessary drivers and libraries to support EFA. If you're choosing an instance type without GPU acceleration you will need to install the drivers and libraries manually and bake a custom AMI.

You can use the [aws-efa-k8s-device-plugin](https://github.com/aws/eks-charts/tree/master/stable/aws-efa-k8s-device-plugin) Helm chart to expose the EFA interfaces on the nodes as an extended resource, and allow pods to request these interfaces to be mounted to their containers.
Your application container will need to have the necessary libraries and runtimes in order to leverage the EFA interfaces (e.g. libfabric).
