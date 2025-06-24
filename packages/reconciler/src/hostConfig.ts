export interface HostInstance {
  type: string;
  props: Record<string, any>;
  children: (HostInstance | HostTextInstance)[];
}

export interface HostTextInstance {
  text: string;
}

export interface HostConfig {
  createInstance(type: string, props: Record<string, any>): HostInstance;
  createTextInstance(text: string): HostTextInstance;
  appendChild(
    parentInstance: HostInstance,
    child: HostInstance | HostTextInstance
  ): void;
  removeChild(
    parentInstance: HostInstance,
    child: HostInstance | HostTextInstance
  ): void;
  commitTextUpdate(
    textInstance: HostTextInstance,
    oldText: string,
    newText: string
  ): void;
  commitUpdate(
    instance: HostInstance,
    updatePayload: Record<string, any>,
    type: string,
    oldProps: Record<string, any>,
    newProps: Record<string, any>
  ): void;
}
