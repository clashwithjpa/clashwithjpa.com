import { toast as svToast } from "svelte-sonner";
import type { ExternalToast } from "svelte-sonner";
import { writable, type Writable } from "svelte/store";

const { set, subscribe }: Writable<boolean> = writable<boolean>(false);
let timeout: NodeJS.Timeout;

const createToastFunction =
    (toastFunction: (message: string, options?: ExternalToast) => string | number) => (message: string, options?: ExternalToast) => {
        const toastId = toastFunction(message, { ...options, duration: 4000 });
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            toast.dismiss();
            set(false);
        }, 4000);
        set(true);
        return toastId;
    };

const toastFunction = (message: string, options?: ExternalToast) => createToastFunction(svToast)(message, options);

type PromiseT<Data = unknown> = Promise<Data> | (() => Promise<Data>);
type PromiseData<ToastData = unknown> = ExternalToast & {
    loading?: string;
    success?: string | ((data: ToastData) => string);
    error?: string | ((error: unknown) => string);
    finally?: () => void | Promise<void>;
};

const toast = Object.assign(toastFunction, {
    success: createToastFunction(svToast.success),
    info: createToastFunction(svToast.info),
    warning: createToastFunction(svToast.warning),
    error: createToastFunction(svToast.error),
    message: createToastFunction(svToast.message),
    promise: <ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData>) => {
        const toastId = svToast.promise(promise, data);
        console.log(`Toast ID: ${toastId}`);
        return toastId;
    },
    dismiss: (id?: number | string) => {
        const toastId = svToast.dismiss(id);
        return toastId;
    },
    loading: createToastFunction(svToast.loading)
});

export { toast, subscribe as subscribeToast };
