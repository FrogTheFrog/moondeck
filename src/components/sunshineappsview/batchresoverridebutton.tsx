import { AppDetails, DialogButton, showModal } from "@decky/ui";
import { HostSettings, logger, setAppResolutionOverride } from "../../lib";
import { VFC, useState } from "react";
import { BatchResOverrideModal } from "./batchresoverridemodal";

interface Props {
  hostSettings: HostSettings;
  shortcuts: AppDetails[];
}

async function applyResolution(shortcuts: AppDetails[], resolution: string): Promise<void> {
  let counter = 0;
  for (const shortcut of shortcuts) {
    if (!await setAppResolutionOverride(shortcut.unAppID, resolution)) {
      logger.warn(`Failed to set app resolution override for ${shortcut.strDisplayName} to ${resolution}! Still continuing...`);
      continue;
    }

    counter++;
  }

  logger.toast(`Applied ${resolution} to ${counter}/${shortcuts.length} app(s).`, { output: "log" });
}

export const BatchResOverrideButton: VFC<Props> = ({ hostSettings, shortcuts }) => {
  const [busy, setBusy] = useState<boolean>(false);
  const doApply = (resolution: string): void => {
    if (busy) {
      return;
    }

    setBusy(true);
    applyResolution(shortcuts, resolution).catch((e) => logger.critical(e)).finally(() => setBusy(false));
  };

  const handleClick = (): void => {
    showModal(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      <BatchResOverrideModal hostSettings={hostSettings} closeModal={() => { }} onSelected={doApply} />
    );
  };

  return (
    <DialogButton disabled={busy} onClick={() => handleClick()}>
      { busy ? "Working..." : "Select resolution" }
    </DialogButton>
  );
};
