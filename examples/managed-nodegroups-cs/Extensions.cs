using System;
using System.Collections.Immutable;
using System.Reflection;
using Pulumi;

static class Extensions
{
    /// <summary>
    /// Helper to convert an OutputType to the equivalent ResourceArgs type.
    /// </summary>
    public static TArgs ToArgs<TArgs>(this object output) where TArgs : ResourceArgs, new()
    {
        if (Attribute.GetCustomAttribute(output.GetType(), typeof(OutputTypeAttribute)) is null)
        {
            throw new InvalidOperationException($"Expected {output.GetType().FullName} to be annotated with {typeof(OutputAttribute).FullName}");
        }

        var args = new TArgs();
        foreach (var field in output.GetType().GetFields(BindingFlags.Instance | BindingFlags.Public))
        {
            object? value = field.GetValue(output);

            // Skip null values.
            if (value is null)
            {
                continue;
            }

            Type valueType = value.GetType();
            if (valueType.IsGenericType && valueType.GetGenericTypeDefinition() == typeof(ImmutableArray<>))
            {
                Type[] genericArgs = valueType.GetGenericArguments();
                if (genericArgs is null || genericArgs.Length != 1)
                {
                    throw new InvalidOperationException($"Expected {valueType.FullName} to have one generic argument");
                }

                value = typeof(InputList<>)
                    .MakeGenericType(genericArgs)
                    .GetMethod("op_Implicit", new[] { typeof(ImmutableArray<>).MakeGenericType(genericArgs) })!
                    .Invoke(null, new object[] { value });
            }
            else if (valueType.IsGenericType && valueType.GetGenericTypeDefinition() == typeof(ImmutableDictionary<,>))
            {
                Type[] genericArgs = valueType.GetGenericArguments();
                if (genericArgs is null || genericArgs.Length != 2)
                {
                    throw new InvalidOperationException($"Expected {valueType.FullName} to have two generic arguments");
                }
                if (genericArgs[0] != typeof(string))
                {
                    throw new InvalidOperationException($"Expected first generic argument of {valueType.FullName} to be {typeof(string).FullName}");
                }

                value = typeof(InputMap<>)
                    .MakeGenericType(genericArgs[1])
                    .GetMethod("op_Implicit", new[] { typeof(ImmutableDictionary<,>).MakeGenericType(genericArgs) })!
                    .Invoke(null, new object[] { value });
            }
            else
            {
                value = typeof(Input<>)
                    .MakeGenericType(valueType)
                    .GetMethod("op_Implicit", new[] { valueType })!
                    .Invoke(null, new object[]{ value });
            }

            PropertyInfo? property = typeof(TArgs).GetProperty(field.Name);
            if (property is null)
            {
                throw new InvalidOperationException($"Expected {typeof(TArgs).FullName} to have property {field.Name}");
            }
            property.SetValue(args, value);
        }

        return args;
    }
}
