import { DialogButton, Field, ModalRoot } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { HostResolution } from "../../lib";
import { NumericTextInput } from "../shared";

interface Props {
  closeModal: () => void;
  currentList: HostResolution["dimensions"];
  updateResolution: (list: HostResolution["dimensions"], index: HostResolution["selectedDimensionIndex"]) => void;
}

export const AddResolutionModal: VFC<Props> = ({ closeModal, currentList, updateResolution }) => {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [widthIsValid, setWidthIsValid] = useState<boolean>(false);
  const [heightIsValid, setHeightIsValid] = useState<boolean>(false);
  const [resolution, setResolution] = useState<HostResolution["dimensions"][number] | null>(null);

  useEffect(() => {
    console.log(width, height, widthIsValid, heightIsValid);
    if (typeof width === "number" && typeof height === "number") {
      setResolution({ width, height });
    } else {
      setResolution(null);
    }
  }, [width, height]);

  const handleClick = (): void => {
    if (resolution !== null) {
      const alreadyInList = currentList.findIndex((item) => item.height === height && item.width === width) !== -1;
      let list = currentList;
      if (!alreadyInList) {
        const newList = [...currentList, resolution];
        newList.sort((a, b) => {
          const nameA = `${a.width}x${a.height}`;
          const nameB = `${b.width}x${b.height}`;
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

      const index = list.findIndex((item) => item.height === resolution.height && item.width === resolution.width);
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
        bottomSeparator="none"
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
        <DialogButton disabled={!widthIsValid || !heightIsValid || resolution === null} onClick={handleClick}>
          Save resolution
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
