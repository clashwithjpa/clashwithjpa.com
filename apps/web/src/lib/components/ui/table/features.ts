/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Option } from "$lib/components/ui/Select.svelte";
import {
    columnFilteringFeature,
    columnResizingFeature,
    columnSizingFeature,
    createFilteredRowModel,
    createSortedRowModel,
    rowSelectionFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_basic,
    sortFn_datetime,
    sortFn_text,
    tableFeatures,
    type ColumnDef,
    type FilterFn,
    type RowData,
} from "@tanstack/svelte-table";

export type NumberFilterOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "between" | "blank" | "notBlank";
export type NumberFilterValue = { op: NumberFilterOp; a?: number | null; b?: number | null };
export type DateFilterOp = "last" | "on" | "before" | "after" | "between";
// a and b are local YYYY-MM-DD days; days is only used by "last".
export type DateFilterValue = { op: DateFilterOp; a?: string | null; b?: string | null; days?: number | null };

export type CellEditor<T> = {
    type: "text" | "number" | "select";
    options?: () => Option[];
    canEdit?: (row: T) => boolean;
    // Receives the parsed value (a number for "number" editors). The page owns the
    // write: it validates, calls the API and replaces the row in its own data.
    commit: (row: T, value: any) => void | Promise<void>;
};

export type TableColumnMeta = {
    filter?: "number" | "set" | "date";
    // Display text for a value in the "set" filter checklist; the value is the
    // cell value as a string ("" for empty).
    filterLabel?: (value: string) => string;
    edit?: CellEditor<any>;
    headerClass?: string;
    cellClass?: string;
};

const numberFilter: FilterFn<any, any> = (row, columnId, filter: NumberFilterValue) => {
    const raw = row.getValue(columnId);
    const blank = raw == null || raw === "";
    if (filter.op === "blank") return blank;
    if (filter.op === "notBlank") return !blank;
    if (blank) return false;
    const v = Number(raw);
    const a = filter.a ?? 0;
    switch (filter.op) {
        case "eq":
            return v === a;
        case "ne":
            return v !== a;
        case "gt":
            return v > a;
        case "gte":
            return v >= a;
        case "lt":
            return v < a;
        case "lte":
            return v <= a;
        case "between":
            return v >= a && v <= (filter.b ?? a);
    }
};
numberFilter.autoRemove = (value: NumberFilterValue | undefined) => {
    if (!value) return true;
    if (value.op === "blank" || value.op === "notBlank") return false;
    return value.a == null || (value.op === "between" && value.b == null);
};

export const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dateFilter: FilterFn<any, any> = (row, columnId, filter: DateFilterValue) => {
    const raw = row.getValue(columnId);
    if (raw == null || raw === "") return false;
    const date = new Date(raw as string | number | Date);
    if (Number.isNaN(date.getTime())) return false;
    if (filter.op === "last") return Date.now() - date.getTime() <= (filter.days ?? 0) * 86_400_000;
    // Same-length ISO day strings compare correctly as text.
    const day = localDay(date);
    const a = filter.a ?? "";
    switch (filter.op) {
        case "on":
            return day === a;
        case "before":
            return day < a;
        case "after":
            return day > a;
        case "between": {
            const [from, to] = [a, filter.b ?? a].sort();
            return day >= from && day <= to;
        }
    }
};
dateFilter.autoRemove = (value: DateFilterValue | undefined) => {
    if (!value) return true;
    if (value.op === "last") return !value.days;
    return !value.a || (value.op === "between" && !value.b);
};

export const setKey = (value: unknown) => (value == null ? "" : String(value));

// Keeps rows whose value is one of the checked keys.
const setFilter: FilterFn<any, any> = (row, columnId, keys: string[]) => keys.includes(setKey(row.getValue(columnId)));
setFilter.autoRemove = (keys: string[] | undefined) => !keys || keys.length === 0;

export const features = tableFeatures({
    columnSizingFeature,
    columnResizingFeature,
    columnFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    filterFns: { number: numberFilter, set: setFilter, date: dateFilter },
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
    rowSelectionFeature,
    columnMeta: {} as TableColumnMeta,
});

export type Features = typeof features;
export type TableColumn<T extends RowData> = ColumnDef<Features, T, any>;
