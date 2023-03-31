import { atom } from 'jotai'

// Create your atoms and derivatives
export const applicationAtom = atom({ scrapeProfiles: [] as { id: string; name: string; }[] });
