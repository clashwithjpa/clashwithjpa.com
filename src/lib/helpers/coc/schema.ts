import { z } from "zod";

export const clanForm: {
    [key: string]: {
        desc: string;
        type: "text" | "number";
        placeholder: string;
    };
} = {
    tag: {
        desc: "Clan Tag (include #)",
        type: "text",
        placeholder: "#ABCDEFGHI"
    },
    clanCode: {
        desc: "Clan Code",
        type: "text",
        placeholder: "JC"
    },
    clanRoleID: {
        desc: "Clan Role ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    memberRoleID: {
        desc: "Member Role ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    elderRoleID: {
        desc: "Elder Role ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    coleaderRoleID: {
        desc: "Co-Leader Role ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    leaderRoleID: {
        desc: "Leader Role ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    leaderID: {
        desc: "Leader ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    channelID: {
        desc: "Channel ID",
        type: "text",
        placeholder: "1234567890123456789"
    },
    attacksRequirement: {
        desc: "Attacks Requirement",
        type: "number",
        placeholder: "120"
    },
    donationsRequirement: {
        desc: "Donations Requirement",
        type: "number",
        placeholder: "1000"
    },
    clangamesRequirement: {
        desc: "Clan Games Requirement",
        type: "number",
        placeholder: "10000"
    }
};

export const clanFormSchema = z.object({
    tag: z.string().min(5).startsWith("#"),
    clanCode: z.string().length(2).nonempty(),
    clanRoleID: z.string().max(19).nonempty(),
    memberRoleID: z.string().max(19).nonempty(),
    elderRoleID: z.string().max(19).nonempty(),
    coleaderRoleID: z.string().max(19).nonempty(),
    leaderRoleID: z.string().max(19).nonempty(),
    leaderID: z.string().max(19).nonempty(),
    channelID: z.string().max(19).nonempty(),
    attacksRequirement: z.number().int(),
    donationsRequirement: z.number().int(),
    clangamesRequirement: z.number().int()
});
