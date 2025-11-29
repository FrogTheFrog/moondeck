import { DialogButton, Field, ModalRoot } from "@decky/ui";
import { useEffect, useState } from "react";
import { HostApp } from "../../lib";
import { IndexedListModal } from "../shared/indexedlist";
import { NonEmptyTextInput } from "../shared";

function isValidIndex(index: number | null, listSize: number): boolean {
  return index !== null && index >= 0 && index < listSize;
}

export const ModifyHostAppModal: IndexedListModal<HostApp["apps"][number]> = ({ closeModal, currentList, currentIndex, updateList }) => {
  const initialValue = isValidIndex(currentIndex, currentList.length) ? currentList[currentIndex!] : null;
  const [name, setName] = useState<string>(initialValue ?? "");
  const [nameIsValid, setNameIsValid] = useState<boolean>(false);
  const [hostApp, setHostApp] = useState<HostApp["apps"][number] | null>(null);

  useEffect(() => {
    if (typeof name === "string") {
      setHostApp(name);
    } else {
      setHostApp(null);
    }
  }, [name]);

  const handleClick = (): void => {
    if (hostApp !== null) {
      const compareWithListItems = (target: string) => (item: string): boolean => item === target;
      const newList = [...currentList];

      if (initialValue != null) {
        const index = newList.findIndex(compareWithListItems(initialValue));
        newList.splice(index, 1);
      }

      const alreadyInList = newList.findIndex(compareWithListItems(hostApp)) !== -1;
      if (!alreadyInList) {
        newList.push(hostApp);
        newList.sort((a, b) => {
          const nameA = a;
          const nameB = b;
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });
      }

      const index = newList.findIndex(compareWithListItems(hostApp));
      updateList(newList, index);
    }
    setHostApp(null);
    closeModal();
  };

  return (
    <ModalRoot closeModal={closeModal}>
      <Field
        label="App name"
        childrenContainerWidth="fixed"
        bottomSeparator="none"
      >
        <NonEmptyTextInput
          value={name}
          setValue={setName}
          setIsValid={setNameIsValid}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={!nameIsValid} onClick={handleClick}>
          Save app name
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
