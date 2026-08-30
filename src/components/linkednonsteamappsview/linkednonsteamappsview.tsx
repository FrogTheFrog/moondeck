import { DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Focusable, showModal } from "@decky/ui";
import { FC, useContext, useState } from "react";
import { LinkGameStreamAppModal } from "../moondecklaunchbutton/linkgamestreamappmodal";
import type { LinkedAppShortcutInfo } from "../../lib/linkedappshortcuts";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";

export const LinkedNonSteamAppsView: FC = () => {
  const { linkedAppShortcuts } = useContext(MoonDeckContext);
  const [linkEntries, setLinkEntries] = useState<LinkedAppShortcutInfo[]>(
    linkedAppShortcuts.getEntries()
  );
  const [pendingSourceAppId, setPendingSourceAppId] = useState<number | null>(null);
  const [confirmingSourceAppId, setConfirmingSourceAppId] = useState<number | null>(null);

  const refreshLinks = (): void => {
    setLinkEntries(linkedAppShortcuts.getEntries());
  };

  const handleChangeLink = (
    sourceAppId: number,
    sourceAppName: string,
    targetName: string
  ): void => {
    const Content: FC<{ closeModal?: () => void }> = ({ closeModal }) => (
      <LinkGameStreamAppModal
        closeModal={() => closeModal?.()}
        sourceAppId={sourceAppId}
        sourceAppName={sourceAppName}
        initialTargetName={targetName}
        onSaved={refreshLinks}
      />
    );

    showModal(<Content />);
  };

  const handleUnlink = (sourceAppId: number): void => {
    setPendingSourceAppId(sourceAppId);

    const unlink = async (): Promise<void> => {
      const helperAppId = linkedAppShortcuts.getId(sourceAppId);
      if (helperAppId === null) {
        refreshLinks();
        return;
      }

      if (!await linkedAppShortcuts.removeShortcut(helperAppId)) {
        logger.toast("Failed to remove linked shortcut!", { output: "error" });
        return;
      }

      refreshLinks();
    };

    unlink()
      .catch((e) => logger.critical(e))
      .finally(() => {
        setPendingSourceAppId(null);
        setConfirmingSourceAppId(null);
      });
  };

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>What are Linked Non-Steam Apps?</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>These are existing Non-Steam shortcuts linked to GameStream host apps.</div>
              <div>Steam Play continues to launch the local shortcut. MoonDeck launches the linked host app.</div>
            </>
          }
          focusable={true}
        />
      </DialogControlsSection>

      <DialogControlsSection>
        <DialogControlsSectionHeader>Linked Non-Steam Apps</DialogControlsSectionHeader>
        {
          linkEntries.length === 0 ?
              <Field
                label="No linked Non-Steam apps"
                description="Create a link with the MoonDeck button on a Non-Steam shortcut."
                focusable={true}
              /> :
              linkEntries.map((entry) => {
                const pending = pendingSourceAppId === entry.sourceAppId;
                const confirming = confirmingSourceAppId === entry.sourceAppId;

                return (
                  <Field
                    key={entry.sourceAppId}
                    label={entry.sourceName}
                    description={"Host app: " + entry.targetName}
                    childrenLayout="below"
                    childrenContainerWidth="max"
                  >
                    <Focusable style={{ display: "flex", gap: "8px" }}>
                      <DialogButton
                        disabled={pending}
                        onClick={() => handleChangeLink(entry.sourceAppId, entry.sourceName, entry.targetName)}
                      >
                        Change link
                      </DialogButton>
                      <DialogButton
                        disabled={pending}
                        onClick={() => {
                          if (confirming) {
                            handleUnlink(entry.sourceAppId);
                          } else {
                            setConfirmingSourceAppId(entry.sourceAppId);
                          }
                        }}
                      >
                        {confirming ? "Confirm unlink" : "Unlink"}
                      </DialogButton>
                      {
                        confirming &&
                        <DialogButton
                          disabled={pending}
                          onClick={() => setConfirmingSourceAppId(null)}
                        >
                          Cancel
                        </DialogButton>
                      }
                    </Focusable>
                  </Field>
                );
              })
        }
      </DialogControlsSection>
    </DialogBody>
  );
};
