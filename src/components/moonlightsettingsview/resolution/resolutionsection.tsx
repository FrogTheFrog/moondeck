import { DialogControlsSection, DialogControlsSectionHeader, Field, Focusable } from "@decky/ui";
import { FC, useContext } from "react";
import { ModifyListButton, RemoveListEntryButton } from "../../shared/indexedlist";
import { ListDropdown, NumericTextInput, ResolutionSelectionDropdown, ToggleField } from "../../shared";
import { getVideoCodecDropdownValues, minBitrate, minFps, HostSettings } from "../../../lib";
import { CurrentHostSettings } from "../../../hooks";
import { HdrSelectionDropdown } from "./hdrselectiondropdown";
import { LinkedDisplayList } from "./linkeddisplaylist";
import { ModifyResolutionModal } from "./modifyresolutionmodal";
import { MoonDeckContext } from "../../../contexts";

interface Props {
  hostSettings: CurrentHostSettings;
}

export const ResolutionSection: FC<Props> = ({ hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  return (
    <DialogControlsSection>
      <DialogControlsSectionHeader>Resolution</DialogControlsSectionHeader>
      <Field
        label="Video codec (optional)"
        description="Codec to be applied when starting stream. Default option will use the codec selected in Moonlight's settings. H.264 is recommended for better decoding latency."
        childrenContainerWidth="fixed"
      >
        <ListDropdown<HostSettings["resolution"]["videoCodec"]>
          optionList={getVideoCodecDropdownValues()}
          label="Default"
          value={hostSettings.resolution.videoCodec}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.videoCodec = value; })}
        />
      </Field>
      <Field
        label="Default bitrate in kbps (optional)"
        description="Bitrate to be applied when starting stream. Will be overridden by the one from custom resolution if provided."
        childrenContainerWidth="fixed"
      >
        <NumericTextInput
          min={minBitrate}
          optional={true}
          value={hostSettings.resolution.defaultBitrate}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.defaultBitrate = value; })}
        />
      </Field>
      <Field
        label="Default FPS (optional)"
        description="FPS to be applied when starting stream. Will be overridden by the one from custom resolution if provided. Providing FPS without bitrate will trigger Moonlight to automatically calculate the bitrate!"
        childrenContainerWidth="fixed"
      >
        <NumericTextInput
          min={minFps}
          optional={true}
          value={hostSettings.resolution.defaultFps}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.defaultFps = value; })}
        />
      </Field>
      <Field
        label="Default HDR"
        description="HDR to be applied when starting stream. Will be overridden by the one from custom resolution if provided."
        childrenContainerWidth="fixed"
      >
        <HdrSelectionDropdown
          value={hostSettings.resolution.defaultHdr}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.defaultHdr = value; })}
        />
      </Field>
      <ToggleField
        label="Use SteamDeck's primary resolution as fallback"
        description="If custom resolution is disabled, SteamDeck's primary resolution will be used - that of internal or external display."
        value={hostSettings.resolution.automatic}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.automatic = value; })}
      />
      <ToggleField
        label="Use custom resolution from the list"
        description="This setting has no effect if the custom resolution list is empty."
        value={hostSettings.resolution.useCustomDimensions}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useCustomDimensions = value; })}
      />
      <Field
        label="Selected custom resolution"
        childrenContainerWidth="fixed"
        bottomSeparator="none"
      >
        <ResolutionSelectionDropdown
          currentIndex={hostSettings.resolution.selectedDimensionIndex}
          currentList={hostSettings.resolution.dimensions}
          setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.selectedDimensionIndex = value; }); }}
        />
      </Field>
      <Field
        childrenContainerWidth="fixed"
        childrenLayout="below"
      >
        <Focusable style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <ModifyListButton
            modal={ModifyResolutionModal}
            currentList={hostSettings.resolution.dimensions}
            currentIndex={null}
            updateList={(list, index) => {
              settingsManager.updateHost((hostSettings) => {
                hostSettings.resolution.dimensions = list;
                hostSettings.resolution.selectedDimensionIndex = index;
              });
            }}
          />
          <ModifyListButton
            modal={ModifyResolutionModal}
            currentList={hostSettings.resolution.dimensions}
            currentIndex={hostSettings.resolution.selectedDimensionIndex}
            updateList={(list, index) => {
              settingsManager.updateHost((hostSettings) => {
                hostSettings.resolution.dimensions = list;
                hostSettings.resolution.selectedDimensionIndex = index;
              });
            }}
          />
          <RemoveListEntryButton
            currentList={hostSettings.resolution.dimensions}
            currentIndex={hostSettings.resolution.selectedDimensionIndex}
            updateList={(list, index) => {
              settingsManager.updateHost((hostSettings) => {
                hostSettings.resolution.dimensions = list;
                hostSettings.resolution.selectedDimensionIndex = index;
              });
            }}
          />
        </Focusable>
      </Field>
      <LinkedDisplayList hostSettings={hostSettings} />
    </DialogControlsSection>
  );
};
