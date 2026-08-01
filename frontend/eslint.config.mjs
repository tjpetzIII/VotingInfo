import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // This codebase intentionally hydrates client-only state (localStorage, shared address
      // context) from inside useEffect after mount, to avoid SSR/CSR hydration mismatches — the
      // exact pattern this React Compiler-oriented rule flags. Baselined off rather than rewritten.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: ["coverage/**"],
  },
];

export default config;
