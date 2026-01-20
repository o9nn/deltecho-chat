/**
 * DialogAdapter - Maps simple dialog type strings to React dialog components
 *
 * This adapter allows Deep Tree Echo to open dialogs using simple type names
 * (like 'confirm', 'alert') instead of React component references.
 *
 * Usage:
 * ```typescript
 * import { openDialogByType, DialogType } from './DialogAdapter'
 *
 * // In UI Bridge:
 * openDialogByType('confirm', {
 *   message: 'Are you sure?',
 *   onConfirm: () => console.log('Confirmed!')
 * })
 * ```
 */

import { getLogger } from "@deltachat-desktop/shared/logger";
import ConfirmationDialog from "../dialogs/ConfirmationDialog";
import AlertDialog from "../dialogs/AlertDialog";

import type { OpenDialog } from "../../contexts/DialogContext";

const log = getLogger("render/components/DeepTreeEchoBot/DialogAdapter");

/**
 * Dialog types that Deep Tree Echo can open
 */
export type DialogType = "confirm" | "alert";
// Add more as needed

/**
 * Props for each dialog type
 */
export interface ConfirmDialogProps {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirmDanger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface AlertDialogProps {
  message: string;
  title?: string;
  buttonLabel?: string;
  onClose?: () => void;
}

/**
 * Dialog type to component/props mapping
 */
interface DialogConfig {
  component: any;
  transformProps: (props: any) => any;
}

const DIALOG_MAP: Record<DialogType, DialogConfig> = {
  confirm: {
    component: ConfirmationDialog,
    transformProps: (props: ConfirmDialogProps) => ({
      message: props.message,
      header: props.title,
      confirmLabel: props.confirmLabel,
      cancelLabel: props.cancelLabel,
      isConfirmDanger: props.isConfirmDanger,
      cb: (confirmed: boolean) => {
        if (confirmed) {
          props.onConfirm?.();
        } else {
          props.onCancel?.();
        }
      },
    }),
  },
  alert: {
    component: AlertDialog,
    transformProps: (props: AlertDialogProps) => ({
      message: props.message,
      cb: () => {
        props.onClose?.();
      },
    }),
  },
};

/**
 * Check if a dialog type is valid
 */
export function isValidDialogType(type: string): type is DialogType {
  return type in DIALOG_MAP;
}

/**
 * Open a dialog by type name
 *
 * @param openDialog - The openDialog function from DialogContext
 * @param type - The dialog type to open
 * @param props - Props for the dialog
 * @returns The dialog ID, or null if failed
 */
export function openDialogByType(
  openDialog: OpenDialog,
  type: DialogType,
  props: any,
): string | null {
  const config = DIALOG_MAP[type];

  if (!config) {
    log.error(`Unknown dialog type: ${type}`);
    return null;
  }

  try {
    const transformedProps = config.transformProps(props);
    const dialogId = openDialog(config.component, transformedProps);
    log.info(`Opened ${type} dialog: ${dialogId}`);
    return dialogId;
  } catch (error) {
    log.error(`Failed to open ${type} dialog:`, error);
    return null;
  }
}

/**
 * Create a dialog opener function for Deep Tree Echo
 *
 * This returns a function that can be used by the UI Bridge to open dialogs
 * without needing direct access to the DialogContext.
 */
export function createDialogOpener(openDialog: OpenDialog) {
  return (type: string, props?: any): string | null => {
    if (!isValidDialogType(type)) {
      log.warn(`Invalid dialog type: ${type}`);
      return null;
    }
    return openDialogByType(openDialog, type, props || {});
  };
}

/**
 * Confirmation helper - returns a Promise that resolves when dialog is closed
 */
export function showConfirmation(
  openDialog: OpenDialog,
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isConfirmDanger?: boolean;
  },
): Promise<boolean> {
  return new Promise((resolve) => {
    openDialogByType(openDialog, "confirm", {
      message,
      title: options?.title,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      isConfirmDanger: options?.isConfirmDanger,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/**
 * Alert helper - returns a Promise that resolves when dialog is closed
 */
export function showAlert(
  openDialog: OpenDialog,
  message: string,
  options?: {
    title?: string;
    buttonLabel?: string;
  },
): Promise<void> {
  return new Promise((resolve) => {
    openDialogByType(openDialog, "alert", {
      message,
      title: options?.title,
      buttonLabel: options?.buttonLabel,
      onClose: () => resolve(),
    });
  });
}
