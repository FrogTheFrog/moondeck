import { Button, Focusable, appDetailsClasses, appDetailsHeaderClasses, basicAppDetailsSectionStylerClasses, joinClassNames, playSectionClasses, sleep } from "@decky/ui";
import { CSSProperties, VFC, useEffect, useRef, useState } from "react";
import { OffsetStyle, achorPositionName } from "./offsetstyle";
import { SettingsManager, UserSettings, isAppTypeSupported, logger } from "../../lib";
import { useCurrentSettings, useMoonDeckAppData } from "../../hooks";
import { ButtonStyle } from "./buttonstyle";
import { ContainerStyle } from "./containerstyle";
import { MoonDeckAppLauncher } from "../../lib/moondeckapplauncher";
import { MoonDeckMain } from "../icons";

interface Props {
  appId: number;
  appName: string;
  appType: number;
  settingsManager: SettingsManager;
  moonDeckAppLauncher: MoonDeckAppLauncher;
}

interface ShellProps {
  buttonPosition?: UserSettings["buttonPosition"];
  buttonStyle: UserSettings["buttonStyle"];
  onClick?: () => Promise<void>;
}

export const MoonDeckLaunchButtonShell: VFC<ShellProps> = ({ onClick, buttonPosition, buttonStyle }) => {
  const [clickPending, setClickPending] = useState(false);
  const handleClick = (() => {
    if (onClick) {
      return () => {
        setClickPending(true);
        onClick().catch((e) => logger.critical(e)).finally(() => setClickPending(false));
      };
    }
    return undefined;
  })();

  return (
    <Focusable className={joinClassNames(basicAppDetailsSectionStylerClasses.AppButtons, "moondeck-container")}>
      <OffsetStyle buttonPosition={buttonPosition} />
      <ContainerStyle buttonPosition={buttonPosition} />
      <ButtonStyle theme={buttonStyle.theme} />
      <Focusable>
        <Button
          disabled={clickPending}
          noFocusRing={!buttonStyle.showFocusRing}
          className={joinClassNames(playSectionClasses.MenuButton, "moondeck-button")}
          onClick={handleClick}
        >
          <MoonDeckMain />
        </Button>
      </Focusable>
    </Focusable>
  );
};

const MoonDeckLaunchButton: VFC<Props> = ({ appId, appName, appType, moonDeckAppLauncher, settingsManager }) => {
  const appData = useMoonDeckAppData(moonDeckAppLauncher);
  const settings = useCurrentSettings(settingsManager);

  if (!isAppTypeSupported(appType) || settings === null || appData?.beingSuspended) {
    return null;
  }

  return (
    <MoonDeckLaunchButtonShell
      buttonPosition={settings.buttonPosition}
      buttonStyle={settings.buttonStyle}
      onClick={async (): Promise<void> => {
        await moonDeckAppLauncher.launchApp(appId, appName);
        await sleep(1000);
      }}
    />
  );
};

function findTopCapsuleParent(ref: HTMLDivElement | null): Element | null {
  const children = ref?.parentElement?.children;
  if (!children) {
    return null;
  }

  let headerContainer: Element | undefined;
  for (const child of children) {
    if (child.className.includes(appDetailsClasses.Header)) {
      headerContainer = child;
      break;
    }
  }

  if (!headerContainer) {
    return null;
  }

  let topCapsule: Element | null = null;
  for (const child of headerContainer.children) {
    if (child.className.includes(appDetailsHeaderClasses.TopCapsule)) {
      topCapsule = child;
      break;
    }
  }

  return topCapsule;
}

export const MoonDeckLaunchButtonAnchor: VFC<Props> = (props) => {
  // There will be no mutation when the page is loaded (either from exiting the game
  // or just newly opening the page), therefore it's visible by default.
  const [show, setShow] = useState<boolean>(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const topCapsule = findTopCapsuleParent(ref?.current);
    if (!topCapsule) {
      logger.error("TopCapsule container not found!");
      return;
    }

    const mutationObserver = new MutationObserver((entries) => {
      for (const entry of entries) {
        if (entry.type !== "attributes" || entry.attributeName !== "class") {
          continue;
        }

        const className = (entry.target as Element).className;
        const fullscreenMode =
          className.includes(appDetailsHeaderClasses.FullscreenEnterStart) ||
          className.includes(appDetailsHeaderClasses.FullscreenEnterActive) ||
          className.includes(appDetailsHeaderClasses.FullscreenEnterDone) ||
          className.includes(appDetailsHeaderClasses.FullscreenExitStart) ||
          className.includes(appDetailsHeaderClasses.FullscreenExitActive);
        const fullscreenAborted =
          className.includes(appDetailsHeaderClasses.FullscreenExitDone);

        setShow(!fullscreenMode || fullscreenAborted);
      }
    });
    mutationObserver.observe(topCapsule, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div id="moondeck" ref={ref} style={{ position: `var(${achorPositionName}, relative)` as CSSProperties["position"], height: 0 }}>
      {show &&
        <MoonDeckLaunchButton {...props} />
      }
    </div>
  );
};
