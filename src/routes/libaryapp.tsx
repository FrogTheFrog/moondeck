/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MoonDeckAppLauncher, SettingsManager, logger } from "../lib";
import { Navigation, afterPatch, appDetailsClasses, createReactTreePatcher, findInReactTree } from "@decky/ui";
import { RoutePatch, routerHook } from "@decky/api";
import { MoonDeckLaunchButtonAnchor } from "../components/moondecklaunchbutton";
import { ReactElement } from "react";

interface Props {
  moonDeckAppLauncher: MoonDeckAppLauncher;
  settingsManager: SettingsManager;
}

function patchLibraryApp(route: string, { moonDeckAppLauncher, settingsManager }: Props): RoutePatch {
  return routerHook.addPatch(
    route,
    (tree: any) => {
      const routeProps = findInReactTree(tree, (x: any) => x?.renderFunc);
      if (routeProps) {
        let appType: number | undefined;
        let appId: number | undefined;
        let appName: string | undefined;

        const patchHandler = createReactTreePatcher([
          (tree: any) => {
            const children = findInReactTree(tree, (x: any) => x?.props?.children?.props?.overview)?.props?.children;
            if (typeof children !== "object") {
              logger.debug(`Failed to patch ${route}, @children!`);
              return null;
            }

            const overview = children.props?.overview;
            if (typeof overview !== "object") {
              logger.error(`Failed to patch ${route}, @overview!`);
              return null;
            }

            if (typeof overview.app_type !== "number") {
              logger.error(`Failed to patch ${route}, @app_type!`);
              return null;
            }

            if (typeof overview.appid !== "number") {
              logger.error(`Failed to patch ${route}, @appid!`);
              return null;
            }

            if (typeof overview.display_name !== "string") {
              logger.error(`Failed to patch ${route}, @display_name!`);
              return null;
            }

            ({ app_type: appType, appid: appId, display_name: appName } = overview);
            return children;
          }
        ], (_: Array<Record<string, unknown>>, ret?: ReactElement) => {
          if (!settingsManager.settings.value?.enableMoondeckShortcuts) {
            return ret;
          }

          if (moonDeckAppLauncher.moonDeckApp.value?.moonDeckAppId === appId) {
            // We are suppressing the navigation to custom shortcut ONLY if this happens after
            // launch via the moondeck button and we MUST navigate back ONLY once
            if (moonDeckAppLauncher.moonDeckApp.canRedirect()) {
              Navigation.NavigateBack();
            }

            return ret;
          }

          type ParentElement = ReactElement<{ children: Array<ReactElement<{ id?: string; overview?: unknown; onShowLaunchingDetails?: unknown }>>; className: string }>;
          const parent = findInReactTree(ret, (x: ParentElement) => Array.isArray(x?.props?.children) && x?.props?.className?.includes(appDetailsClasses.InnerContainer)) as ParentElement;
          if (typeof parent !== "object") {
            logger.error(`Failed to patch ${route} - parent element not found!`);
            return ret;
          }

          if (typeof appType !== "number" || typeof appId !== "number" || typeof appName !== "string") {
            logger.error(`Failed to patch ${route} - undefined data!`);
            return ret;
          }

          const hltbIndex = parent.props.children.findIndex((x) => x.props.id === "hltb-for-deck");
          const appPanelIndex = parent.props.children.findIndex((x) => x.props.overview && x.props.onShowLaunchingDetails);
          parent.props.children.splice(
            hltbIndex < 0 ? (appPanelIndex < 0 ? -1 : appPanelIndex - 1) : hltbIndex,
            0,
            <MoonDeckLaunchButtonAnchor
              appId={appId}
              appName={appName}
              appType={appType}
              moonDeckAppLauncher={moonDeckAppLauncher}
              settingsManager={settingsManager} />
          );

          return ret;
        });

        afterPatch(routeProps, "renderFunc", patchHandler);
      }

      return tree;
    }
  );
}

export function LibraryAppHook(props: Props): () => void {
  const route = "/library/app/:appid";
  const libraryPatch = patchLibraryApp(route, props);
  return () => {
    routerHook.removePatch(route, libraryPatch);
  };
}
