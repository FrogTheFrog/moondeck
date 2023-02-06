import { DialogButton, Field, ModalRoot } from "decky-frontend-lib";
import { Dimension, HostResolution, maxBitrate, minBitrate, stringifyDimension } from "../../lib";
import { VFC, useEffect, useState } from "react";
import { NumericTextInput } from "../shared";

interface Props {
  closeModal: () => void;
  currentList: HostResolution["dimensions"];
  updateResolution: (list: HostResolution["dimensions"], index: HostResolution["selectedDimensionIndex"]) => void;
}

export const AddResolutionModal: VFC<Props> = ({ closeModal, currentList, updateResolution }) => {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [bitrate, setBitrate] = useState<number | null>(null);
  const [widthIsValid, setWidthIsValid] = useState<boolean>(false);
  const [heightIsValid, setHeightIsValid] = useState<boolean>(false);
  const [bitrateIsValid, setBitrateIsValid] = useState<boolean>(false);
  const [resolution, setResolution] = useState<HostResolution["dimensions"][number] | null>(null);

  useEffect(() => {
    if (typeof width === "number" && typeof height === "number" && (typeof bitrate === "number" || bitrate === null)) {
      setResolution({ width, height, bitrate });
    } else {
      setResolution(null);
    }
  }, [width, height, bitrate]);

  const handleClick = (): void => {
    if (resolution !== null) {
      const compareWithListItems = (item: Dimension): boolean => item.height === height && item.width === width && item.bitrate === bitrate;
      const alreadyInList = currentList.findIndex(compareWithListItems) !== -1;
      let list = currentList;
      if (!alreadyInList) {
        const newList = [...currentList, resolution];
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

        list = newList;
      }

      const index = list.findIndex(compareWithListItems);
      updateResolution(list, index);
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
        bottomSeparator="none"
      >
        <NumericTextInput
          min={minBitrate}
          max={maxBitrate}
          optional={true}
          value={bitrate}
          setValue={setBitrate}
          setIsValid={setBitrateIsValid}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={!widthIsValid || !heightIsValid || !bitrateIsValid || resolution === null} onClick={handleClick}>
          Save resolution
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
