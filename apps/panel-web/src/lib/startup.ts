export function substituteStartup(template: string, env: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => env[key] ?? `{{${key}}}`);
}

export function extractStartupPlaceholders(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

export function buildStartupEnvironment(
  variables: Array<{ eggVariable: { envVariable: string }; variableValue: string }>,
  server: { memory: number; defaultAllocation: { ip: string; port: number } },
): Record<string, string> {
  const env: Record<string, string> = {
    SERVER_MEMORY: String(server.memory),
    SERVER_IP: server.defaultAllocation.ip,
    SERVER_PORT: String(server.defaultAllocation.port),
  };
  for (const v of variables) {
    env[v.eggVariable.envVariable] = v.variableValue;
  }
  return env;
}

export function dockerImageOptions(dockerImages: Record<string, string> | undefined): Array<{ label: string; value: string }> {
  if (!dockerImages) return [];
  return Object.entries(dockerImages).map(([label, value]) => ({ label, value }));
}
