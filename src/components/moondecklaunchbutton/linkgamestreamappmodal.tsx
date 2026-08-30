import { DialogButton, Field, ModalRoot } from "@decky/ui";
import { FC, useContext, useEffect, useState } from "react";
import { getMoonDeckRunPath, logger } from "../../lib";
import { ListDropdown } from "../shared";
import { MoonDeckContext } from "../../contexts";

interface Props {
  closeModal: () => void;
  sourceAppId: number;
  sourceAppName: string;
  initialTargetName?: string | null;
  onSaved?: () => void;
}

export const LinkGameStreamAppModal: FC<Props> = ({
  closeModal,
  sourceAppId,
  sourceAppName,
  initialTargetName = null,
  onSaved
}) => {
  const { connectivityManager, linkedAppShortcuts } = useContext(MoonDeckContext);
  const [appNames, setAppNames] = useState<string[]>([]);
  const [targetName, setTargetName] = useState<string | null>(initialTargetName);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    connectivityManager.buddyProxy.getGameStreamAppNames()
      .then((names) => setAppNames(names ?? []))
      .catch((e) => logger.critical(e));
  }, []);

  const handleClick = (): void => {
    if (targetName === null) {
      return;
    }

    setSavePending(true);
    const saveLink = async (): Promise<void> => {
      const existingHelperAppId = linkedAppShortcuts.getId(sourceAppId);

      if (existingHelperAppId === null) {
        const execPath = await getMoonDeckRunPath();
        if (execPath === null) {
          return;
        }

        const helperAppId = await linkedAppShortcuts.addGameStreamShortcut(
          sourceAppId,
          sourceAppName,
          targetName,
          execPath
        );
        if (helperAppId === null) {
          return;
        }
      } else {
        if (!await linkedAppShortcuts.updateGameStreamShortcut(sourceAppId, targetName)) {
          logger.toast("Failed to change linked host app!", { output: "error" });
          return;
        }
      }

      onSaved?.();
      closeModal();
    };

    saveLink()
      .catch((e) => logger.critical(e))
      .finally(() => setSavePending(false));
  };

  return (
    <ModalRoot closeModal={closeModal}>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <ListDropdown
          label="Select host app"
          optionList={appNames}
          singleItemSelection={true}
          stringifySimpleLabels={false}
          value={targetName}
          setValue={setTargetName}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={targetName === null || savePending} onClick={handleClick}>
          {initialTargetName === null ? "Save link" : "Change link"}
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
