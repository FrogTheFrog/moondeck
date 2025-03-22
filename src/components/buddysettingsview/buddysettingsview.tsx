import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field, Focusable } from "@decky/ui";
import { FC, useContext } from "react";
import { HostAppSelectionDropdown, LabelWithIcon, ToggleField } from "../shared";
import { ModifyListButton, RemoveListEntryButton } from "../shared/indexedlist";
import { HostOff } from "../icons";
import { ModifyHostAppModal } from "./modifyhostappmodal";
import { MoonDeckContext } from "../../contexts";
import { useCurrentHostSettings } from "../../hooks";

export const BuddySettingsView: FC = () => {
  const { settingsManager } = useContext(MoonDeckContext);
  const hostSettings = useCurrentHostSettings();
  if (hostSettings === null) {
    return (
      <DialogBody>
        <DialogControlsSection>
          <Field
            label={<LabelWithIcon icon={HostOff} label="HOST IS NOT SELECTED" />}
            description="Go to host selection page to select host"
            bottomSeparator="none" />
        </DialogControlsSection>
      </DialogBody>
    );
  }

  return (
    <DialogBody>
      <Field
        description="These settings only apply for MoonDeck and NonSteam apps."
        focusable={true}
      />
      <DialogControlsSection>
        <DialogControlsSectionHeader>General</DialogControlsSectionHeader>
        <ToggleField
          label="Automatically close Steam on host when gaming session ends"
          description={
            <>
              <div>If disabled, Steam will remain open in bigpicture mode (no way to leave bigpicture without closing Steam without using the UI).</div>
            </>
          }
          value={hostSettings.closeSteamOnceSessionEnds}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.closeSteamOnceSessionEnds = value; })}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>GameStream App</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>This is the app that will be used by MoonDeck when starting gamestream.</div>
              <br />
              <div>Can be customized to have some specific "do/undo" logic on the host.</div>
              <br />
              <div>If the list is empty, the MoonDeckStream name is used by default.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="Selected app name"
          childrenContainerWidth="fixed"
          bottomSeparator="none"
        >
          <HostAppSelectionDropdown
            currentIndex={hostSettings.hostApp.selectedAppIndex}
            currentList={hostSettings.hostApp.apps}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.hostApp.selectedAppIndex = value; }); }}
          />
        </Field>
        <Field
          childrenContainerWidth="fixed"
          childrenLayout="below"
        >
          <Focusable style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <ModifyListButton
              modal={ModifyHostAppModal}
              currentList={hostSettings.hostApp.apps}
              currentIndex={null}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
            <ModifyListButton
              modal={ModifyHostAppModal}
              currentList={hostSettings.hostApp.apps}
              currentIndex={hostSettings.hostApp.selectedAppIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
            <RemoveListEntryButton
              currentList={hostSettings.hostApp.apps}
              currentIndex={hostSettings.hostApp.selectedAppIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
          </Focusable>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
