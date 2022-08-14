import { StatusField, StatusFieldProps } from "./statusfield";
import { GameSteamMain } from "../icons";
import { ServerStatus } from "../../lib";
import { VFC } from "react";

export const ServerStatusField: VFC<StatusFieldProps<ServerStatus>> = (props) => {
  const extendedProps = { ...props, ...{ icon: GameSteamMain } };
  return (
    <StatusField {...extendedProps} />
  );
};
