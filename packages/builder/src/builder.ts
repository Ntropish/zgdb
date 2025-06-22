import { Orchestrator, StepHandler, OrchestratorKernel } from "@tsmk/kernel";

/**
 * Defines the handler for the 'apply' phase of a capability.
 * This is called when the builder is being configured.
 * @param args - The arguments passed to the apply handler.
 * @returns An optional value to be passed to the 'build' handler.
 */
type BuilderCapabilityApplyHandler<TArgs extends any[], TReturnType> = (
  ...args: TArgs
) => TReturnType;

/**
 * Defines the handler for the 'build' phase of a capability.
 * This becomes a step in the final orchestrator kernel.
 */
type BuilderCapabilityBuildHandler<
  TProduct,
  TApplyReturnType,
  TArgs extends any[]
> = (product: TProduct, applyReturn: TApplyReturnType, ...args: TArgs) => void;

/**
 * A capability defines a named, configurable unit of a build process.
 */
export type BuilderCapability<
  TProduct,
  TApplyArgs extends any[],
  TApplyReturnType
> = {
  apply?: BuilderCapabilityApplyHandler<TApplyArgs, TApplyReturnType>;
  build?: BuilderCapabilityBuildHandler<TProduct, TApplyReturnType, TApplyArgs>;
};

/**
 * A map of named capabilities that can be used by the builder.
 */
export type CapabilityMap<TProduct> = {
  [name: string]: BuilderCapability<TProduct, any, any>;
};

/**
 * Creates a new builder instance, configured with a set of available capabilities.
 * The builder is used to assemble a build process by applying these capabilities.
 */
export function createBuilder<TProduct extends Orchestrator.PipelineContext>(
  capabilities: CapabilityMap<TProduct>
) {
  const steps: StepHandler<TProduct>[] = [];

  return {
    capabilities,
    apply(capabilityName: keyof typeof capabilities, ...args: any[]): any {
      const capability = this.capabilities[capabilityName];
      if (!capability) {
        throw new Error(`Capability "${String(capabilityName)}" not found.`);
      }

      const result = capability.apply?.(...args);

      if (capability.build) {
        if (result) {
          steps.push((product: TProduct) =>
            capability.build!(product, result, ...args)
          );
        } else {
          steps.push((product: TProduct) =>
            capability.build!(product, this, ...args)
          );
        }
      }

      return result ?? this;
    },
    getPipeline(): OrchestratorKernel<TProduct> {
      return Orchestrator.create(steps);
    },
  };
}
