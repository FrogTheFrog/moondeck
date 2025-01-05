import { DialogButton, Field, showModal } from "@decky/ui";
import { FC, ReactNode, useState } from "react";
import { SettingsManager, getDisplayIdentifiers, logger, stringifyDimension } from "../../lib";
import { CurrentHostSettings } from "../../hooks";
import { LinkedDisplayModal } from "./linkeddisplaymodal";
import { ToggleField } from "../shared";
import { TrashMain } from "../icons";

interface Props {
  hostSettings: CurrentHostSettings;
  settingsManager: SettingsManager;
}

export const LinkedDisplayList: FC<Props> = ({ hostSettings, settingsManager }) => {
  const [linking, setLinking] = useState<boolean>(false);
  const hasCustomResolutions = hostSettings.resolution.dimensions.length > 0;
  const handleLinkClick = (): void => {
    setLinking(true);
    getDisplayIdentifiers().then((displays) => {
      if (displays === null) {
        setLinking(false);
        logger.toast("Steam failed to get display information!", { output: "warn" });
        return;
      }

      showModal(<LinkedDisplayModal closeModal={() => { setLinking(false); }} displays={displays.all} hostSettings={hostSettings} settingsManager={settingsManager} />);
    }).catch((error) => {
      logger.critical(error);
      setLinking(false);
    });
  };
  const unlinkDisplay = (display: string): void => {
    const dimensions = hostSettings.resolution.dimensions;
    for (const dimension of dimensions) {
      dimension.linkedDisplays = dimension.linkedDisplays.filter((value) => value !== display);
    }

    settingsManager.updateHost((settings) => { settings.resolution.dimensions = dimensions; });
  };

  let linkedEntries: ReactNode = null;
  {
    const mappedEntries: Array<{ display: string; resolution: string }> = [];
    for (const dimension of hostSettings.resolution.dimensions) {
      for (const display of dimension.linkedDisplays) {
        mappedEntries.push({ display, resolution: stringifyDimension(dimension) });
      }
    }

    if (mappedEntries.length > 0) {
      linkedEntries = <>
        {mappedEntries.map((entry) => {
          return (
            <Field
              key={entry.display}
              label={entry.display}
              description={entry.resolution}
              childrenContainerWidth="min"
            >
              <DialogButton
                onClick={() => unlinkDisplay(entry.display)}
                style={{ minWidth: "auto", fontSize: "20px", lineHeight: "16px", padding: "10px 12px" }}>
                <TrashMain />
              </DialogButton>
            </Field>
          );
        })}
      </>;
    }
  }

  return (
    <>
      <ToggleField
        label="Enable display linking"
        description={
          <>
            <div>Here you can link the display to the custom resolution. MoonDeck will automatically select the linked resolution for the primary display in this list. This will work regardless of whether the custom resolution option is enabled or not.</div>
            <br />
            <div>Note: Steam provides a very limited information about the displays, so nearly identical displays cannot be differentiated.</div>
          </>
        }
        value={hostSettings.resolution.useLinkedDisplays}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useLinkedDisplays = value; })}
        bottomSeparator="none"
      />
      <Field
        label="Link display to custom resolution"
      >
        <DialogButton
          disabled={!hasCustomResolutions || linking}
          focusable={hasCustomResolutions}
          onClick={() => handleLinkClick()}
        >
          Link
        </DialogButton>
      </Field>
      {linkedEntries}
    </>
  );
};
