import type { ICellRendererComp, ICellRendererParams } from "ag-grid-community";
import { mount, unmount, type Component } from "svelte";

export function svelteRenderer(component: any) {
    return class SvelteRendererWrapper extends SvelteCellRenderer {
        constructor() {
            super();
        }
        override init(params: ICellRendererParams) {
            super.init({ ...params, component } as any);
        }
    };
}

export class SvelteCellRenderer implements ICellRendererComp {
    private eGui!: HTMLDivElement;
    private componentInstance: any;

    init(params: ICellRendererParams & { component: Component }) {
        this.eGui = document.createElement("div");
        this.eGui.style.height = "100%";
        this.eGui.style.width = "100%";
        this.eGui.style.display = "flex";
        this.eGui.style.alignItems = "center";

        const SvelteComponent = params.component;

        this.componentInstance = mount(SvelteComponent, {
            target: this.eGui,
            props: { params },
        });
    }

    getGui() {
        return this.eGui;
    }

    refresh(params: ICellRendererParams) {
        // Returning false makes AG Grid recreate the cell (Svelte 5 props update via `$state`); fine here.
        return false;
    }

    destroy() {
        if (this.componentInstance) {
            unmount(this.componentInstance);
        }
    }
}
