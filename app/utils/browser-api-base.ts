export class ApiEndpointConfigurationError extends Error {
  readonly code = "API_ENDPOINT_CONFIGURATION_INVALID";

  constructor(message = "The browser API endpoint configuration is invalid") {
    super(message);
    this.name = "ApiEndpointConfigurationError";
  }
}

function browserPageOrigin(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.href;
}

function trimTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "");
}

function isCompatiblePort(left: URL, right: URL): boolean {
  const leftPort = left.port || (left.protocol === "http:" ? "80" : "443");
  const rightPort = right.port || (right.protocol === "http:" ? "80" : "443");
  return leftPort === rightPort;
}

/**
 * Resolves the public API base at the browser boundary. A production page and
 * its API share an origin, so a relative base prevents stale HTTP runtime
 * configuration from creating mixed-content credential requests.
 */
export function resolveBrowserApiBase(configuredBase: string, pageOrigin = browserPageOrigin()): string {
  const input = configuredBase.trim();
  if (!input) return "";

  let endpoint: URL;
  try {
    endpoint = new URL(input, pageOrigin ?? "http://ssr.invalid");
  } catch {
    throw new ApiEndpointConfigurationError();
  }

  if (!['http:', 'https:'].includes(endpoint.protocol)
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash) {
    throw new ApiEndpointConfigurationError();
  }

  if (!pageOrigin) return trimTrailingSlash(endpoint.href);

  let page: URL;
  try {
    page = new URL(pageOrigin);
  } catch {
    throw new ApiEndpointConfigurationError();
  }

  const sameHost = endpoint.hostname === page.hostname
    && (endpoint.protocol === "http:" && page.protocol === "https:"
      ? (!endpoint.port || endpoint.port === "80" || endpoint.port === page.port)
      : isCompatiblePort(endpoint, page));
  if (endpoint.origin === page.origin) {
    return endpoint.pathname === "/" ? "" : trimTrailingSlash(endpoint.origin + endpoint.pathname);
  }

  // A known old release can contain the same host over HTTP. Keep the
  // browser on HTTPS by using the current document origin.
  if (page.protocol === "https:" && endpoint.protocol === "http:" && sameHost) return "";
  if (page.protocol === "https:" && endpoint.protocol === "http:") {
    throw new ApiEndpointConfigurationError();
  }

  return trimTrailingSlash(endpoint.href);
}
