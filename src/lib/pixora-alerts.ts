"use client";

import Swal, { SweetAlertIcon } from "sweetalert2";

const pixoraClasses = {
  popup: "pixora-swal-popup",
  title: "pixora-swal-title",
  htmlContainer: "pixora-swal-body",
  confirmButton: "pixora-swal-confirm",
  cancelButton: "pixora-swal-cancel",
  actions: "pixora-swal-actions",
};

type PixoraAlertOptions = {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmText?: string;
};

export function showPixoraAlert({
  title,
  text,
  icon = "info",
  confirmText = "Got it",
}: PixoraAlertOptions) {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: confirmText,
    buttonsStyling: false,
    customClass: pixoraClasses,
    background: "#fffdf8",
    color: "#2a170d",
  });
}

export async function confirmPixoraAction({
  title,
  text,
  confirmText = "Confirm",
  cancelText = "Cancel",
  icon = "warning",
}: PixoraAlertOptions & { cancelText?: string }) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    buttonsStyling: false,
    customClass: pixoraClasses,
    background: "#fffdf8",
    color: "#2a170d",
  });

  return result.isConfirmed;
}

export function showPixoraToast({
  title,
  icon = "success",
}: {
  title: string;
  icon?: SweetAlertIcon;
}) {
  return Swal.fire({
    toast: true,
    position: "top-end",
    title,
    icon,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    background: "#fffdf8",
    color: "#2a170d",
    customClass: {
      popup: "pixora-swal-toast",
      title: "pixora-swal-toast-title",
    },
  });
}
