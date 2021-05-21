import { toast, Slide } from "react-toastify";
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const errorToast = (text = "An error occured") =>
	toast(text, {
		position: "bottom-center",
		hideProgressBar: true,
		draggable: false,
		autoClose: 5000,
		pauseOnHover: false,
		closeOnClick: true,
		transition: Slide,
		type: "error",
	});
