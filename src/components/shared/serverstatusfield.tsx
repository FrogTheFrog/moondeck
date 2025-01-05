import { StatusField, StatusFieldProps } from "./statusfield";
import { FC } from "react";
import { GameSteamMain } from "../icons";
import { ServerStatus } from "../../lib";

export const ServerStatusField: FC<StatusFieldProps<ServerStatus>> = (props) => {
  const extendedProps = { ...props, ...{ icon: GameSteamMain } };
  return (
    <StatusField {...extendedProps} />
  );
};
