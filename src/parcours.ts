export const PARCOURS = {
  pouvoir: {
    forme: "soleil",
    nom: "Pouvoir",
    accroche: "Qui commande, au nom de quoi, et pourquoi on obéit.",
    a_venir: [],
  },
  institutions: {
    forme: "arche",
    nom: "Institutions et droit",
    accroche: "Les règles qui organisent le pouvoir et celles qui le limitent.",
    a_venir: [],
  },
  economie: {
    forme: "biscuit",
    nom: "Économie",
    accroche: "Monnaie, dette, commerce : les forces qui contraignent les États.",
    a_venir: [],
  },
  militaire: {
    forme: "gemme",
    nom: "Militaire et géopolitique",
    accroche: "La force armée comme instrument politique.",
    a_venir: [],
  },
  societe: {
    forme: "fleur",
    nom: "Esprit et société",
    accroche: "Comment les hommes pensent, croient, se rassemblent et se divisent.",
    a_venir: [],
  },
} as const;

export type ParcoursId = keyof typeof PARCOURS;
