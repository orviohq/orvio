export function validateFragmentSchema(fragment: string): {
  error?: string;
  result?: any;
};
export function verifyReplay(
  replay: string,
  result: any,
): Promise<{ ok: boolean; error?: string }>;
export const __test__: any;
