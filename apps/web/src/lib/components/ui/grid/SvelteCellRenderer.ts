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
        // In Svelte 5, updating props cleanly from outside a component needs `$state` wrappers
        // Returning false tells AG Grid to tear down and recreate the cell which is fine for most cases
        // However, it can be optimized using signals if needed later
        return false;
    }

    destroy() {
        if (this.componentInstance) {
            unmount(this.componentInstance);
        }
    }
}
