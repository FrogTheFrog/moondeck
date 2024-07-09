import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { UserSettings } from "../../lib";
import { VFC } from "react";

interface Props {
  disabled: boolean;
  currentHost: UserSettings["currentHostId"];
  onForget: (value: Exclude< UserSettings["currentHostId"], null>) => void;
}

export const HostForgetButton: VFC<Props> = ({ disabled, currentHost, onForget }) => {
  const handleClick = (): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to forget?"
        strDescription="This action cannot be undone."
        onOK={() => {
          if (currentHost !== null) {
            onForget(currentHost);
          }
        }}
      />
    );
  };

  return (
    <DialogButton disabled={disabled} onClick={handleClick}>
      Forget
    </DialogButton>
  );
};
