export type Track = {
    id: string;
    title: string;
    artist: string;
    // A track either plays from /music or opens a link instead.
    src?: string;
    href?: string;
};

const FANKIT = "Supercell fan kit";
const MACLEOD = "Kevin MacLeod";

// Fan kit music is covered by Supercell's Fan Content Policy. Kevin MacLeod's
// tracks are CC BY 4.0, so the Music page must keep crediting them.
export const TRACKS: Track[] = [
    { id: "lofi", title: "Clash lofi", artist: FANKIT, src: "/music/coc-lofi.ogg" },
    { id: "war-2025", title: "War season", artist: FANKIT, src: "/music/war-2025.ogg" },
    { id: "wastelands", title: "Wastelands", artist: FANKIT, src: "/music/wastelands.ogg" },
    { id: "cosmic-curse", title: "Cosmic Curse", artist: FANKIT, src: "/music/cosmic-curse.ogg" },
    { id: "championship", title: "Championship muzak", artist: FANKIT, src: "/music/championship.ogg" },
    { id: "jingle-bells", title: "Jingle Bells mashup", artist: FANKIT, src: "/music/jingle-bells.ogg" },
    { id: "christmas-tree", title: "Christmas Tree mashup", artist: FANKIT, src: "/music/christmas-tree.ogg" },
    { id: "angels", title: "Angels We Have Heard on High", artist: FANKIT, src: "/music/angels.ogg" },
    { id: "mystery", title: "Mystery track", artist: "Trust me", href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { id: "gymnopedie", title: "Gymnopédie No. 1", artist: MACLEOD, src: "/music/gymnopedie.ogg" },
    { id: "canon-in-d", title: "Canon in D", artist: MACLEOD, src: "/music/canon-in-d.ogg" },
];
