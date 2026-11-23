type ResolveApiBaseUrlOptions = {
  configuredUrl: string;
  development: boolean;
  platform: string;
  webHostname: string | undefined;
};

export function resolveApiBaseUrl({
  configuredUrl,
  development,
  platform,
  webHostname,
}: ResolveApiBaseUrlOptions): string {
  if (!development || platform !== 'web' || !webHostname) {
    return configuredUrl;
  }

  const apiUrl = new URL(configuredUrl);
  apiUrl.hostname = webHostname;

  return apiUrl.origin;
}
