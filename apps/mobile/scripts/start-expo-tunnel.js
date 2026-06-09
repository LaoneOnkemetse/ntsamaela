/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const path = require("path");
const localtunnel = require("localtunnel");

const projectRoot = path.join(__dirname, "..");
const port = parseInt(process.env.EXPO_DEV_SERVER_PORT || "8081", 10);
let tunnel;
let expoProcess;

async function main() {
  console.log("\nCreating tunnel (works over mobile data / hotspot)...\n");
  tunnel = await localtunnel({ port, local_host: "127.0.0.1" });
  const proxyUrl = tunnel.url;

  const statusUrl = `${proxyUrl}/status`;
  console.log("========================================");
  console.log("1) Open this on phone Chrome (NOT the bare tunnel URL):");
  console.log(statusUrl);
  console.log("   You should see: packager-status:running");
  console.log("2) In Expo Go: Scan QR below, or Enter URL manually:");
  console.log(`   ${proxyUrl.replace("https://", "exp://")}`);
  console.log("(Root tunnel URL is often blank — that is normal.)");
  console.log("========================================\n");

  tunnel.on("close", () => {
    console.error("\nTunnel closed. Restart: npm run start:tunnel\n");
  });

  expoProcess = spawn(
    "npx",
    ["expo", "start", "--lan", "--port", String(port)],
    {
      cwd: projectRoot,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, EXPO_PACKAGER_PROXY_URL: proxyUrl },
    },
  );

  expoProcess.on("exit", (code) => {
    if (tunnel) tunnel.close();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => {
  if (expoProcess) expoProcess.kill();
  if (tunnel) tunnel.close();
  process.exit(0);
});

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
