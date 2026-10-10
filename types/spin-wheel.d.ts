/** Minimal typings for the parts of `spin-wheel` (MIT, CrazyTim) that RePlay uses. */
declare module "spin-wheel" {
  export interface WheelItem {
    label?: string;
    backgroundColor?: string;
    labelColor?: string;
    weight?: number;
    value?: unknown;
  }

  export interface WheelRestEvent {
    type: "rest";
    currentIndex: number;
    rotation: number;
  }

  export interface WheelProps {
    items?: WheelItem[];
    radius?: number;
    rotation?: number;
    pointerAngle?: number;
    isInteractive?: boolean;
    borderColor?: string;
    borderWidth?: number;
    lineColor?: string;
    lineWidth?: number;
    itemLabelFont?: string;
    itemLabelColors?: string[];
    itemBackgroundColors?: string[];
    itemLabelAlign?: "left" | "right" | "center";
    itemLabelRadius?: number;
    itemLabelRadiusMax?: number;
    itemLabelRotation?: number;
    itemLabelBaselineOffset?: number;
    itemLabelFontSizeMax?: number;
    itemLabelStrokeColor?: string;
    itemLabelStrokeWidth?: number;
    pixelRatio?: number;
    onRest?: (event: WheelRestEvent) => void;
  }

  export class Wheel {
    constructor(container: HTMLElement, props?: WheelProps);
    spinToItem(itemIndex?: number, duration?: number, spinToCenter?: boolean, numberOfRevolutions?: number, direction?: number, easingFunction?: ((n: number) => number) | null): void;
    stop(): void;
    resize(): void;
    remove(): void;
    rotation: number;
  }
}
