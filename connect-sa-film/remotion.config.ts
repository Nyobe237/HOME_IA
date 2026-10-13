import { Config } from "@remotion/cli/config";

// Rendu WebGL logiciel (SwiftShader) : reproductible sans GPU.
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setBrowserExecutable(
  process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
);
