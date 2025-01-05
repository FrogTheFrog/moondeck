import { DialogButton, Focusable, Navigation, staticClasses } from "@decky/ui";
import { FC } from "react";
import { SettingsMain } from "../icons";

export const TitleView: FC<unknown> = () => {
  const onSettingsClick = (): void => {
    Navigation.CloseSideMenus();
    Navigation.Navigate("/moondeck");
  };

  return (
    <Focusable
      style={{
        display: "flex",
        padding: "0",
        width: "100%",
        boxShadow: "none",
        alignItems: "center",
        justifyContent: "space-between"
      }}
      className={staticClasses.Title}
    >
      <div>MoonDeck</div>
      <DialogButton
        style={{ height: "28px", width: "40px", minWidth: 0, padding: "10px 12px" }}
        onClick={onSettingsClick}
      >
        <SettingsMain style={{ marginTop: "-4px", display: "block" }} />
      </DialogButton>
    </Focusable>
  );
};
