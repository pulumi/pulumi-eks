// Enable the creation of the 4xlarge node group.
export const config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 3,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    nginxNodeSelectorTermValues: ["t3.2xlarge"],
};
