import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { FC } from "react";
import { UserSettings } from "../../lib";

interface Props {
  disabled: boolean;
  currentHost: UserSettings["currentHostId"];
  onForget: (value: Exclude<UserSettings["currentHostId"], null>) => void;
}

export const HostForgetButton: FC<Props> = ({ disabled, currentHost, onForget }) => {
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
