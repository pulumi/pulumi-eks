// Remove the NGINX & echoserver workload.
export const config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 3,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    deployWorkload: false,
};
