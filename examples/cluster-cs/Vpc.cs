using System.Collections.Immutable;
using Pulumi;

class Vpc : ComponentResource
{
    [Output("vpcId")]
    public Output<string> VpcId { get; private set; } = null!;

    [Output("publicSubnetIds")]
    public Output<ImmutableArray<string>> PublicSubnetIds { get; private set; } = null!;

    [Output("privateSubnetIds")]
    public Output<ImmutableArray<string>> PrivateSubnetIds { get; private set; } = null!;

    public Vpc(string name, VpcArgs args, ComponentResourceOptions? options = null)
        : base("testvpc:index:Vpc", name, args ?? new VpcArgs(), options, remote: true)
    {
    }
}

class VpcArgs : ResourceArgs
{
    [Input("tags")]
    private InputMap<string>? _tags;

    public InputMap<string> Tags
    {
        get => _tags ?? (_tags = new InputMap<string>());
        set => _tags = value;
    }
}
