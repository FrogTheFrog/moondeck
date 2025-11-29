import { DialogButton, Field, showModal } from "@decky/ui";
import { FC, ReactNode, useContext, useState } from "react";
import { HostSettings, audioOptions, getAudioDevices, logger } from "../../../lib";
import { LinkedAudioModal } from "./linkedaudiomodal";
import { MoonDeckContext } from "../../../contexts";
import { ToggleField } from "../../shared";
import { TrashMain } from "../../icons";

interface Props {
  hostSettings: HostSettings;
}

export const LinkedAudioList: FC<Props> = ({ hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);
  const [linking, setLinking] = useState<boolean>(false);
  const handleLinkClick = (): void => {
    setLinking(true);
    getAudioDevices().then((devices) => {
      if (devices === null) {
        setLinking(false);
        logger.toast("Steam failed to get audio device information!", { output: "warn" });
        return;
      }

      showModal(<LinkedAudioModal closeModal={() => { setLinking(false); }} devices={devices.outputDevices} hostSettings={hostSettings} />);
    }).catch((error) => {
      logger.critical(error);
      setLinking(false);
    });
  };
  const unlinkAudio = (device: string): void => {
    const linkedAudio = hostSettings.audio.linkedAudio;
    const newLinkedAudio: typeof linkedAudio = {};
    for (const [key, value] of Object.entries(linkedAudio)) {
      const filteredValue = value.filter((value) => value !== device);
      if (filteredValue.length > 0) {
        newLinkedAudio[key as typeof audioOptions[number]] = filteredValue;
      }
    }

    settingsManager.updateHost((settings) => { settings.audio.linkedAudio = newLinkedAudio; });
  };

  let linkedEntries: ReactNode = null;
  {
    const mappedEntries: Array<{ device: string; option: string }> = [];
    for (const [option, devices] of Object.entries(hostSettings.audio.linkedAudio)) {
      for (const device of devices) {
        mappedEntries.push({ option, device });
      }
    }

    if (mappedEntries.length > 0) {
      linkedEntries =
        <>
          {mappedEntries.map((entry) => {
            return (
              <Field
                key={entry.device}
                label={entry.device}
                description={entry.option}
                childrenContainerWidth="min"
              >
                <DialogButton
                  onClick={() => unlinkAudio(entry.device)}
                  style={{ minWidth: "auto", fontSize: "20px", lineHeight: "16px", padding: "10px 12px" }}
                >
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
        label="Enable audio linking"
        description="Here you can link the audio output to the Moonlight's audio option. MoonDeck will then automatically select the linked audio option based on the currently active audio output."
        value={hostSettings.audio.useLinkedAudio}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.audio.useLinkedAudio = value; })}
        bottomSeparator="none"
      />
      <Field
        label="Link audio output"
      >
        <DialogButton
          disabled={linking}
          onClick={() => handleLinkClick()}
        >
          Link
        </DialogButton>
      </Field>
      {linkedEntries}
    </>
  );
};
