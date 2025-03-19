import "vite";

declare module "vite" {
  interface ServerOptions {
    // Allow allowedHosts to be a boolean along with the existing allowed values
    allowedHosts?: boolean | true | string[];
  }
}
