import { Launcher } from "chrome-launcher";
import os from "node:os";
import path from "node:path";
export function getChromeUserDataDir() {
    const home = os.homedir();
    switch (process.platform) {
        case "darwin":
            return path.join(home, "Library", "Application Support", "Google", "Chrome");
        case "win32":
            return path.join(process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"), "Google", "Chrome", "User Data");
        default:
            return path.join(home, ".config", "google-chrome");
    }
}
export async function findChromeExecutable() {
    const installs = await Launcher.getInstallations();
    if (!installs.length)
        throw new Error("No Chrome installation detected");
    return installs[0];
}
