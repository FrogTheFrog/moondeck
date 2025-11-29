import { EThirdPartyControllerConfiguration } from "@decky/ui/dist/globals/steam-client/Input";
import { sleep } from "@decky/ui";

export type AppResolutionOverrideConstants = "Default" | "Native";

export enum ControllerConfigOption {
  Disable = EThirdPartyControllerConfiguration.Off,
  Default = EThirdPartyControllerConfiguration.DefaultSetting,
  Enable = EThirdPartyControllerConfiguration.On
}
export type ControllerConfigValue = `${ControllerConfigOption}` extends `${infer T extends number}` ? T : never;

export async function waitForPredicate(retries: number, delay: number, predicate: () => (boolean | Promise<boolean>)): Promise<boolean> {
  const waitImpl = async (): Promise<boolean> => {
    try {
      let tries = retries + 1;
      while (tries-- !== 0) {
        if (await predicate()) {
          return true;
        }

        if (tries > 0) {
          await sleep(delay);
        }
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  };

  return await waitImpl();
}
