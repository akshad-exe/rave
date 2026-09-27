import { cn as mergeClassNames } from "cn";

export function cn(
  ...inputs: Parameters<typeof mergeClassNames>
): ReturnType<typeof mergeClassNames> {
  return mergeClassNames(...inputs);
}
