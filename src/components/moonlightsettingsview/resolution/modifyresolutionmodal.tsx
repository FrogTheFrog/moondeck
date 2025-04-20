import { DialogButton, Field, ModalRoot } from "@decky/ui";
import { Dimension, HostResolution, minBitrate, minFps, stringifyDimension } from "../../../lib";
import { useEffect, useState } from "react";
import { IndexedListModal } from "../../shared/indexedlist";
import { NumericTextInput } from "../../shared";

function isValidIndex(index: number | null, listSize: number): boolean {
  return index !== null && index >= 0 && index < listSize;
}

export const ModifyResolutionModal: IndexedListModal<HostResolution["dimensions"][number]> = ({ closeModal, currentList, currentIndex, updateList }) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const initialValue = isValidIndex(currentIndex, currentList.length) ? currentList[currentIndex!] : null;
  const [width, setWidth] = useState<number | null>(initialValue?.width ?? null);
  const [height, setHeight] = useState<number | null>(initialValue?.height ?? null);
  const [bitrate, setBitrate] = useState<number | null>(initialValue?.bitrate ?? null);
  const [fps, setFps] = useState<number | null>(initialValue?.fps ?? null);
  const [widthIsValid, setWidthIsValid] = useState<boolean>(false);
  const [heightIsValid, setHeightIsValid] = useState<boolean>(false);
  const [bitrateIsValid, setBitrateIsValid] = useState<boolean>(false);
  const [fpsIsValid, setFpsIsValid] = useState<boolean>(false);
  const [resolution, setResolution] = useState<HostResolution["dimensions"][number] | null>(null);

  useEffect(() => {
    if (typeof width === "number" && typeof height === "number" && (typeof bitrate === "number" || bitrate === null) && (typeof fps === "number" || fps === null)) {
      setResolution({ width, height, bitrate, fps, linkedDisplays: initialValue?.linkedDisplays ?? [] });
    } else {
      setResolution(null);
    }
  }, [width, height, bitrate, fps]);

  const handleClick = (): void => {
    if (resolution !== null) {
      const compareWithListItems = (target: Dimension) => (item: Dimension): boolean => item.height === target.height && item.width === target.width && item.bitrate === target.bitrate && item.fps === target.fps;
      const newList = [...currentList];

      if (initialValue != null) {
        const index = newList.findIndex(compareWithListItems(initialValue));
        newList.splice(index, 1);
      }

      const alreadyInList = newList.findIndex(compareWithListItems(resolution)) !== -1;
      if (!alreadyInList) {
        newList.push(resolution);
        newList.sort((a, b) => {
          const nameA = stringifyDimension(a);
          const nameB = stringifyDimension(b);
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });
      }

      const index = newList.findIndex(compareWithListItems(resolution));
      updateList(newList, index);
    }
    setResolution(null);
    closeModal();
  };

  return (
    <ModalRoot closeModal={closeModal}>
      <div style={{ fontWeight: "bolder", marginBottom: "1em" }}>
        Enter custom resolution
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
        label="Bitrate in kbps (optional)"
        childrenContainerWidth="fixed"
      >
        <NumericTextInput
          min={minBitrate}
          optional={true}
          value={bitrate}
          setValue={setBitrate}
          setIsValid={setBitrateIsValid}
        />
      </Field>
      <Field
        label="FPS (optional)"
        childrenContainerWidth="fixed"
        bottomSeparator="none"
      >
        <NumericTextInput
          min={minFps}
          optional={true}
          value={fps}
          setValue={setFps}
          setIsValid={setFpsIsValid}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={!widthIsValid || !heightIsValid || !bitrateIsValid || !fpsIsValid || resolution === null} onClick={handleClick}>
          Save resolution
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
