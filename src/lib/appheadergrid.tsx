import { CSSProperties, FC, ReactElement, ReactNode, VFC, cloneElement, useEffect, useRef, useState } from "react";
import { Focusable, appDetailsClasses, appDetailsHeaderClasses, findInReactTree } from "@decky/ui";

interface GridSpace {
  value: string;
}

type GridRow = Readonly<Array<string | GridSpace>>;

interface GridAreas {
  top: GridRow;
  middle: GridRow;
  bottom: GridRow;
}

export type ChangeAreaCallback = (areaName: string) => boolean;
type ChangeAreaInternalCallback = (from: string, to: string) => boolean;

export interface GridElementProps<T extends string = string> {
  areaName: T;
  changeArea: ChangeAreaCallback;
}

interface GridElements {
  [key: string]: {
    element: ReactElement<GridElementProps>;
    alignOptions: AlignOptions;
  };
}

export interface AlignOptions {
  alignSelf?: CSSProperties["alignSelf"];
}

interface HeaderGridAreaProps {
  areaName: string;
  children?: ReactNode;
  alignOptions: AlignOptions;
}

const HeaderGridArea: FC<HeaderGridAreaProps> = ({ areaName, children, alignOptions }) => {
  const style: CSSProperties = { ...alignOptions as CSSProperties, gridArea: areaName };

  return (
    <div style={style}>
      {children}
    </div>
  );
};

interface HeaderGridRowProps {
  gridRow: GridRow;
  gridElements: GridElements;
  changeAreaInternal: ChangeAreaInternalCallback;
}

const HeaderGridRow: VFC<HeaderGridRowProps> = ({ gridRow, gridElements, changeAreaInternal }) => {
  const children: ReactElement[] = [];
  const templateAreas: string[] = [];
  const templateColumns: string[] = [];

  for (const area of gridRow) {
    if (typeof area !== "string") {
      templateAreas.push(".");
      templateColumns.push(area.value);
      continue;
    }

    const item = gridElements[area];
    if (item) {
      children.push(
        <HeaderGridArea key={area} areaName={area} alignOptions={item.alignOptions}>{
          cloneElement(item.element, {
            areaName: area,
            changeArea: (areaName: string) => changeAreaInternal(area, areaName)
          })
        }</HeaderGridArea>);
      templateAreas.push(area);
      templateColumns.push("min-content");
    }
  }

  return (
    <Focusable style={{
      display: "grid",
      gridTemplateAreas: `"${templateAreas.join(" ")}"`,
      gridAutoColumns: `${templateColumns.join(" ")}`,
      gap: "10px"
    }}
    >
      {children}
    </Focusable>
  );
};

interface HeaderGridProps {
  height: number;
  gridAreas: GridAreas;
  gridElements: GridElements;
  changeAreaInternal: ChangeAreaInternalCallback;
}

const HeaderGrid: VFC<HeaderGridProps> = ({ height, gridAreas, gridElements, changeAreaInternal }) => {
  const searchBarHeight = 40;
  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    top: `${searchBarHeight}px`,
    height: `${height - searchBarHeight}px`,
    width: "100vw",
    display: "grid",
    gridAutoRows: "1fr",
    padding: "0 2.8vw 17px 2.8vw",
    boxSizing: "border-box"
  };

  return (
    <div style={style}>
      <HeaderGridRow gridRow={gridAreas.top} gridElements={gridElements} changeAreaInternal={changeAreaInternal} />
      <HeaderGridRow gridRow={gridAreas.middle} gridElements={gridElements} changeAreaInternal={changeAreaInternal} />
      <HeaderGridRow gridRow={gridAreas.bottom} gridElements={gridElements} changeAreaInternal={changeAreaInternal} />
    </div>
  );
};

interface HeaderGridAnchorProps {
  isAppHeaderGridAnchor: true;
  version: number;
  gridAreas: GridAreas;
  gridElements: GridElements;
}

function gridAreaExists(areas: GridAreas, name: string): boolean {
  return areas.top.includes(name) || areas.middle.includes(name) || areas.bottom.includes(name);
}

const HeaderGridAnchor: VFC<HeaderGridAnchorProps> = (props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>(0);
  const [gridElements, setGridElements] = useState<GridElements>(props.gridElements);
  const changeAreaInternal = (from: string, to: string): boolean => {
    if (from === to) {
      return false;
    }

    if (!gridAreaExists(props.gridAreas, to)) {
      return false;
    }

    const { [from]: removedElement, ...elements } = gridElements;
    elements[to] = removedElement;
    setGridElements(elements);

    return true;
  };

  useEffect(() => {
    const children = ref?.current?.parentElement?.children;
    if (!children) {
      console.log("Children not found!");
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
      console.log("Header container not found!");
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
      console.log("TopCapsule container not found!");
      return;
    }

    const mutationObserver = new MutationObserver((entries) => {
      for (const entry of entries) {
        if (entry.type !== "attributes" || entry.attributeName !== "class") {
          continue;
        }

        const className = (entry.target as Element).className;
        const hide = className.includes("Fullscreen") && !className.includes(appDetailsHeaderClasses.FullscreenExitDone);
        setHeight(hide ? 0 : headerContainer?.getBoundingClientRect().height ?? 0);
      }
    });
    mutationObserver.observe(topCapsule, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div ref={ref} style={{ height: 0 }}>
      {height > 0 &&
        <HeaderGrid
          height={height}
          gridAreas={props.gridAreas}
          gridElements={gridElements}
          changeAreaInternal={changeAreaInternal} />
      }
    </div>
  );
};

export function gridSpace(value: string): GridSpace {
  return { value };
}

const currentAnchorVersion = 1;
export const defaultGridAreas = {
  top: ["A"],
  middle: [gridSpace("1fr"), "B", gridSpace("1fr"), "C"],
  bottom: [gridSpace("1fr"), "moondeck"]
} as const;

type GridRowLiterals<T extends GridRow> = Exclude<T[number], GridSpace>;
type GridAreaLiterals<T extends GridAreas> = GridRowLiterals<T["top"]> | GridRowLiterals<T["middle"]> | GridRowLiterals<T["bottom"]>;

export type InjectionCallback<T extends string> = (area: T, element: ReactElement<Partial<GridElementProps>>, alignOptions?: AlignOptions) => boolean;

export function appHeaderGridInternal<T extends GridAreas>(gridAreas: T, element: ReactElement): InjectionCallback<GridAreaLiterals<T>> | null {
  type ParentElement = ReactElement<{ children: Array<ReactElement<HeaderGridAnchorProps>>; className: string }>;
  const parent = findInReactTree(element, (x: ParentElement) => Array.isArray(x?.props?.children) && x?.props?.className?.includes("InnerContainer")) as ParentElement;
  if (typeof parent !== "object") {
    console.log("Failed in appHeaderGrid - parent element not found!");
    return null;
  }

  let gridComponent = parent.props.children.find((x) => x.props.isAppHeaderGridAnchor);
  if (!gridComponent) {
    gridComponent = <HeaderGridAnchor isAppHeaderGridAnchor={true} version={currentAnchorVersion} gridAreas={gridAreas} gridElements={{}} />;
    parent.props.children.splice(1, 0, gridComponent);
  }

  const version = gridComponent.props.version;
  if (version !== currentAnchorVersion) {
    console.log(`Failed in appHeaderGrid - version mismatch. Current version ${currentAnchorVersion} vs element version ${version}!`);
    return null;
  }

  return (area: string, element: ReactElement, alignOptions: AlignOptions = { alignSelf: "center" }) => {
    if (gridComponent && gridAreaExists(gridAreas, area)) {
      gridComponent.props.gridElements[area] = { element, alignOptions };
      return true;
    }
    return false;
  };
}

export function appHeaderGrid(element: ReactElement): InjectionCallback<GridAreaLiterals<typeof defaultGridAreas>> | null {
  return appHeaderGridInternal(defaultGridAreas, element);
}
