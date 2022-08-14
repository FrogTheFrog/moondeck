import { Button, appDetailsClasses, appDetailsHeaderClasses, joinClassNames, playSectionClasses, sleep } from "decky-frontend-lib";
import { CSSProperties, VFC, useEffect, useRef, useState } from "react";
import { SettingsManager, isAppTypeSupported, logger } from "../../lib";
import { useCurrentSettings, useMoonDeckAppData } from "../../hooks";
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
  style?: CSSProperties;
  onClick?: () => Promise<void>;
}

export const MoonDeckLaunchButtonShell: VFC<ShellProps> = ({ onClick, style }) => {
  const [clickPending, setClickPending] = useState(false);
  const handleClick = onClick
    ? () => {
        setClickPending(true);
        onClick().catch((e) => logger.critical(e)).finally(() => setClickPending(false));
      }
    : undefined;

  return (
    <div style={style}>
      <style>
        {`
          .moondeck-button {
            background: #222;
          }
          
          .moondeck-button:hover {
            background-color: #50555D;
          }
          
          .moondeck-button:focus {
            background-color: #fff;
          }
          
          .moondeck-button:focus > svg {
            fill: #000;
          }
        `}
      </style>
      <Button
        disabled={clickPending}
        noFocusRing={false}
        className={joinClassNames(playSectionClasses.MenuButton, "moondeck-button")}
        onClick={handleClick}
      >
        <MoonDeckMain />
      </Button>
    </div>
  );
};

const MoonDeckLaunchButton: VFC<Props> = ({ appId, appName, appType, moonDeckAppLauncher, settingsManager }) => {
  const settings = useCurrentSettings(settingsManager);
  const appData = useMoonDeckAppData(moonDeckAppLauncher);

  if (!isAppTypeSupported(appType) || settings === null || appData?.beingSuspended) {
    return null;
  }

  return (
    <MoonDeckLaunchButtonShell
      style={{ position: "absolute", right: "2.8vw", bottom: "16px" }}
      onClick={async (): Promise<void> => {
        await moonDeckAppLauncher.launchApp(appId, appName);
        await sleep(1000);
      }} />
  );
};

export const MoonDeckLaunchButtonAnchor: VFC<Props> = (props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState<boolean>(true);

  useEffect(() => {
    const children = ref?.current?.parentElement?.children;
    if (!children) {
      logger.error("Children not found!");
      return;
    }

    let headerContainer: Element | undefined;
    for (const child of children) {
      if (child.className.includes(appDetailsClasses.Header)) {
        headerContainer = child;
        break;
      }
    }

    if (!headerContainer) {
      logger.error("Header container not found!");
      return;
    }

    let topCapsule: Element | undefined;
    for (const child of headerContainer.children) {
      if (child.className.includes(appDetailsHeaderClasses.TopCapsule)) {
        topCapsule = child;
        break;
      }
    }

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
        const hide = className.includes("Fullscreen") && !className.includes(appDetailsHeaderClasses.FullscreenExitDone);
        setShow(!hide);
      }
    });
    mutationObserver.observe(topCapsule, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div id="moondeck" ref={ref} style={{ position: "relative", height: 0 }}>
      {show &&
        <MoonDeckLaunchButton {...props} />
      }
    </div>
  );
};
