// @ts-check
import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
];

export default eslintConfig;
