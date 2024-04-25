import React from "react";
import Link from "./Link";
import { LinkProps } from "./types";
import TelegramIcon from "../Svg/Icons/Telegram";

const LinkExternal: React.FC<React.PropsWithChildren<LinkProps>> = ({
  children,
  showExternalIcon = true,
  ...props
}) => {
  return (
    <Link external {...props}>
      {children}
      {showExternalIcon && <TelegramIcon color={props.color ? props.color : "primary"} ml="4px" />}
    </Link>
  );
};

export default LinkExternal;
