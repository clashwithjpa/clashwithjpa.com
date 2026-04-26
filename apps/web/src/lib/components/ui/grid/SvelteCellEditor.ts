import type { ICellEditorComp, ICellEditorParams } from "ag-grid-community";
import { mount, unmount, type Component } from "svelte";

export function svelteEditor(component: any) {
    return class SvelteEditorWrapper extends SvelteCellEditor {
        constructor() {
            super();
        }
        override init(params: ICellEditorParams) {
            super.init({ ...params, component } as any);
        }
    };
}

export class SvelteCellEditor implements ICellEditorComp {
    private eGui!: HTMLDivElement;
    private componentInstance: any;
    private params!: ICellEditorParams;

    init(params: ICellEditorParams & { component: Component }) {
        this.params = params;
        this.eGui = document.createElement("div");
        this.eGui.style.height = "100%";
        this.eGui.style.width = "100%";
        this.eGui.style.display = "flex";
        this.eGui.style.alignItems = "center";
        // prevent dragging row from interacting with input clicks
        this.eGui.addEventListener("mousedown", (e) => e.stopPropagation());

        const SvelteComponent = params.component;

        this.componentInstance = mount(SvelteComponent, {
            target: this.eGui,
            props: { params, value: params.value },
        });
    }

    getGui() {
        return this.eGui;
    }

    getValue() {
        // The Svelte component should write its value to params._currentValue
        // as Svelte 5 components don't easily expose bound props as instance fields.
        return (this.params as any)._currentValue !== undefined ? (this.params as any)._currentValue : this.params.value;
    }

    destroy() {
        if (this.componentInstance) {
            unmount(this.componentInstance);
        }
    }

    isPopup() {
        // If the editor is a popup, return true.
        // We can expose an initial param if it should act as a popup.
        return (this.params as any).isPopupEditor === true;
    }
}
