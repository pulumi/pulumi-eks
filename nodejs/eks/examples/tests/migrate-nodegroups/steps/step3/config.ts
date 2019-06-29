// Scale down the 2xlarge node group to a desired capacity of 0 workers.
export const config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 0,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    nginxNodeSelectorTermValues: ["c5.4xlarge"],
};
