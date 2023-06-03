import { DialogButton, Field, Focusable, ModalRoot } from "decky-frontend-lib";
import { HostSettings, getCurrentDisplayModeString, logger } from "../../lib";
import { NumericTextInput, ResolutionSelectionDropdown } from "../shared";
import { ReactNode, VFC, useEffect, useState } from "react";

interface Props {
  hostSettings: HostSettings;
  onSelected: (resolution: string) => void;
  closeModal: () => void;
}

export const BatchResOverrideModal: VFC<Props> = ({ hostSettings, onSelected, closeModal }) => {
  const [currentMode, setCurrentMode] = useState<string | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [widthIsValid, setWidthIsValid] = useState<boolean>(false);
  const [heightIsValid, setHeightIsValid] = useState<boolean>(false);
  const [resolution, setResolution] = useState<string | null>(null);

  useEffect(() => {
    getCurrentDisplayModeString().then((mode) => setCurrentMode(mode)).catch((e) => logger.critical(e));
  }, []);

  useEffect(() => {
    if (typeof width === "number" && typeof height === "number") {
      setResolution(`${width}x${height}`);
    } else {
      setResolution(null);
    }
  }, [width, height]);

  const handleClick = (value: string | null): void => {
    if (value !== null) {
      onSelected(value);
    }
    closeModal();
  };

  let customResolution: ReactNode = null;
  if (hostSettings.resolution.dimensions.length > 0) {
    customResolution =
      <Field
        label="Custom resolution (bitrate is ignored)"
        childrenContainerWidth="fixed"
      >
        <ResolutionSelectionDropdown
          singleItemSelection={true}
          currentIndex={-1}
          currentList={hostSettings.resolution.dimensions}
          setIndex={(value) => {
            if (value >= 0 && value < hostSettings.resolution.dimensions.length) {
              const dimension = hostSettings.resolution.dimensions[value];
              handleClick(`${dimension.width}x${dimension.height}`);
              return;
            }

            logger.toast("Index out of range!", { output: "error" });
          }}
        />
      </Field>;
  }

  let currentResolution: ReactNode = null;
  if (currentMode) {
    currentResolution =
      <Field
        childrenContainerWidth="fixed"
        childrenLayout="below"
      >
        <DialogButton onClick={() => handleClick(currentMode)}>
          Current resolution ({currentMode})
        </DialogButton>
      </Field>;
  }

  return (
    <ModalRoot closeModal={closeModal}>
      <div style={{ fontWeight: "bolder", marginBottom: "1em" }}>
        Select one of the presets
      </div>
      {customResolution}
      {currentResolution}
      <Field
        childrenContainerWidth="fixed"
        childrenLayout="below"
      >
        <Focusable style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <DialogButton onClick={() => handleClick("Default")}>
            "Default"
          </DialogButton>
          <DialogButton onClick={() => handleClick("Native")}>
            "Native"
          </DialogButton>
        </Focusable>
      </Field>
      <div style={{ fontWeight: "bolder", margin: "1em 0" }}>
        Or enter resolution
      </div>
      <Field
        label="Width"
        childrenContainerWidth="fixed"
      >
        <NumericTextInput
          value={width}
          setValue={setWidth}
          setIsValid={setWidthIsValid}
        />
      </Field>
      <Field
        label="Height"
        childrenContainerWidth="fixed"
      >
        <NumericTextInput
          value={height}
          setValue={setHeight}
          setIsValid={setHeightIsValid}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={!widthIsValid || !heightIsValid || resolution === null} onClick={() => handleClick(resolution)}>
          Apply
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
