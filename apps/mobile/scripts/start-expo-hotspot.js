/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const { networkInterfaces } = require("os");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const port = parseInt(process.env.EXPO_DEV_SERVER_PORT || "8081", 10);

function hotspotIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (
        net.family === "IPv4" &&
        !net.internal &&
        net.address.startsWith("192.168.137.")
      ) {
        return net.address;
      }
    }
  }
  return "192.168.137.1";
}

const host = hotspotIp();

console.log("\n========================================");
console.log("PC HOTSPOT — use this URL in Expo Go:");
console.log(`exp://${host}:${port}`);
console.log(`http://${host}:${port}  (test in phone browser)`);
console.log("========================================\n");
console.log("If connection fails, run as Admin:");
console.log("  .\\scripts\\allow-expo-firewall.ps1\n");

const expoProcess = spawn(
  "npx",
  ["expo", "start", "--lan", "--port", String(port)],
  {
    cwd: projectRoot,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: host },
  },
);

process.on("SIGINT", () => {
  expoProcess.kill();
  process.exit(0);
});
