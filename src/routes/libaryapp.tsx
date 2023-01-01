import { MoonDeckAppLauncher, SettingsManager, logger } from "../lib";
import { Navigation, RoutePatch, ServerAPI, afterPatch, appDetailsClasses, findInReactTree, wrapReactType } from "decky-frontend-lib";
import { MoonDeckLaunchButtonAnchor } from "../components/moondecklaunchbutton";
import { ReactElement } from "react";

interface Props {
  serverAPI: ServerAPI;
  moonDeckAppLauncher: MoonDeckAppLauncher;
  settingsManager: SettingsManager;
}

type FirstElement = ReactElement<
{
  children?: ReactElement<{
    overview: {
      app_type?: number;
      appid?: number;
      display_name?: string;
    } | undefined;
  } | undefined>;
} | undefined>;

function patchLibraryApp(route: string, { serverAPI, moonDeckAppLauncher, settingsManager }: Props): RoutePatch {
  return serverAPI.routerHook.addPatch(
    route,
    (routeProps?: { path?: string; children?: ReactElement<{ renderFunc: boolean }> }) => {
      if (!routeProps?.children?.props?.renderFunc) {
        return routeProps;
      }

      // No need for wrap
      afterPatch(
        routeProps.children.props,
        "renderFunc",
        (_1: Array<Record<string, unknown>>, ret1?: FirstElement): FirstElement | undefined | null => {
          const ret1Children = ret1?.props?.children;
          if (typeof ret1Children !== "object") {
            logger.debug(`Failed to patch ${route}, ret1#children!`);
            return ret1;
          }

          const overview = ret1Children.props?.overview;
          if (typeof overview !== "object") {
            logger.error(`Failed to patch ${route}, ret1#overview!`);
            return ret1;
          }

          if (typeof overview.app_type !== "number") {
            logger.error(`Failed to patch ${route}, ret1#app_type!`);
            return ret1;
          }

          if (typeof overview.appid !== "number") {
            logger.error(`Failed to patch ${route}, ret1#appid!`);
            return ret1;
          }

          if (typeof overview.display_name !== "string") {
            logger.error(`Failed to patch ${route}, ret1#display_name!`);
            return ret1;
          }

          const { app_type: appType, appid: appId, display_name: appName } = overview;
          if (moonDeckAppLauncher.moonDeckApp.value?.moonDeckAppId === appId) {
            // We are suppressing the navigation to custom shortcut ONLY if this happens after
            // launch via the moondeck button and we MUST navigate back ONLY once
            if (moonDeckAppLauncher.moonDeckApp.canRedirect()) {
              Navigation.NavigateBack();
            }

            return null;
          }

          wrapReactType(ret1Children);
          afterPatch(
            ret1Children.type,
            "type",
            (_2: Array<Record<string, unknown>>, ret2?: ReactElement): ReactElement | undefined => {
              type ParentElement = ReactElement<{ children: Array<ReactElement<{ id?: string }>>; className: string }>;
              const parent = findInReactTree(ret2, (x: ParentElement) => Array.isArray(x?.props?.children) && x?.props?.className?.includes(appDetailsClasses.InnerContainer)) as ParentElement;
              if (typeof parent !== "object") {
                logger.error(`Failed to patch ${route} - parent element not found!`);
                return ret2;
              }

              const hltbIndex = parent.props.children.findIndex((x) => x.props.id === "hltb-for-deck");
              parent.props.children.splice(
                hltbIndex < 0 ? -2 : hltbIndex,
                0,
                <MoonDeckLaunchButtonAnchor
                  appId={appId}
                  appName={appName}
                  appType={appType}
                  moonDeckAppLauncher={moonDeckAppLauncher}
                  settingsManager={settingsManager} />
              );

              return ret2;
            }
          );
          return ret1;
        }
      );
      return routeProps;
    }
  );
}

export function LibraryAppHook(props: Props): () => void {
  const route = "/library/app/:appid";
  const libraryPatch = patchLibraryApp(route, props);
  return () => {
    props.serverAPI.routerHook.removePatch(route, libraryPatch);
  };
}
